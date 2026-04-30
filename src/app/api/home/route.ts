import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Home-page location-aware payload.
 *
 * PERFORMANCE NOTE (2026-04-21):
 * Previous implementation fetched ALL 37K+ places in 37 paginated Supabase
 * round-trips every single request, then computed city scores in JavaScript.
 * This pushed home SSR to ~7 seconds.
 *
 * We now read from pre-computed materialized views (`city_scores`,
 * `directory_countries`, `directory_cities`) — ~3 lightweight round-trips
 * total. Target: < 400 ms total.
 *
 * The MVs are refreshed by the existing `refresh_directory_views()` cron
 * and on mutations, so the data is current to within a day worst-case.
 */
export const revalidate = 300 // 5 minutes edge cache for bg queries

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const city = searchParams.get('city') || ''
  const country = searchParams.get('country') || ''
  // Cookieless calls (no location params) are identical for every guest,
  // so the CDN can dedupe them. Personalised calls vary per user and
  // shouldn't be shared.
  const isCookieless = !lat && !lng && !city && !country

  // Two queries in parallel: top-8 cities + 1-row platform_stats MV that
  // holds all the hero counters (replaces the previous trio of
  // directory_countries scan + directory_cities head count + sanctuaries
  // count). MV is refreshed by refresh_directory_views().
  const [topCitiesPromise, statsPromise] = await Promise.all([
    supabase
      .from('city_scores')
      .select('city, country, score, grade, fv_count, place_count, per_capita, center_lat, center_lng')
      .order('score', { ascending: false })
      .limit(8),
    supabase
      .from('platform_stats')
      .select('total_places, fully_vegan, restaurants, stores, stays, sanctuaries, countries, cities, cities_ranked')
      .single(),
  ])

  const topCitiesRaw = topCitiesPromise.data || []
  const statsRow = statsPromise.data as any | null

  const topCities = topCitiesRaw.map((r: any) => ({
    city: r.city,
    country: r.country,
    score: r.score,
    grade: r.grade,
    fvCount: r.fv_count,
    placeCount: r.place_count,
    perCapita: r.per_capita ?? undefined,
    center: (r.center_lat != null && r.center_lng != null) ? [Number(r.center_lat), Number(r.center_lng)] : undefined,
  }))

  const totalPlaces = statsRow?.total_places ?? 0
  const fullyVeganCount = statsRow?.fully_vegan ?? 0
  const restaurants = statsRow?.restaurants ?? 0
  const stores = statsRow?.stores ?? 0
  const stays = statsRow?.stays ?? 0
  const sanctuaries = statsRow?.sanctuaries ?? 0
  const totalCountries = statsRow?.countries ?? 0
  const totalCities = statsRow?.cities ?? 0
  const citiesRanked = statsRow?.cities_ranked ?? 0

  // Nearby places — only hit the `places` table if we have a location hint.
  let nearbyPlaces: any[] = []
  let nearbySanctuaries: any[] = []
  let nearbyStays: any[] = []
  let userCityScore = null

  if (lat && lng) {
    const { data } = await supabase
      .from('places')
      .select('id, name, slug, category, vegan_level, main_image_url, images, latitude, longitude, city, country, average_rating, review_count')
      .gte('latitude', lat - 0.5).lte('latitude', lat + 0.5)
      .gte('longitude', lng - 1).lte('longitude', lng + 1)
      .is('archived_at', null)
      .limit(100)

    if (data) {
      const withDist = data.map((p: any) => ({
        ...p,
        distance: Math.round(haversine(lat, lng, p.latitude, p.longitude) * 10) / 10,
      })).sort((a, b) => a.distance - b.distance)

      nearbyPlaces      = withDist.filter(p => p.category === 'eat').slice(0, 6)
      nearbySanctuaries = withDist.filter(p => p.category === 'organisation').slice(0, 3)
      nearbyStays       = withDist.filter(p => p.category === 'hotel').slice(0, 3)

      if (withDist[0]) {
        userCityScore = topCities.find(c => c.city === withDist[0].city) || await fetchCityScore(supabase, withDist[0].city, withDist[0].country)
      }
    }
  }

  // Fallback: by city name when no coordinates.
  if (nearbyPlaces.length === 0 && city) {
    let q = supabase
      .from('places')
      .select('id, name, slug, category, vegan_level, main_image_url, images, latitude, longitude, city, country, average_rating, review_count')
      .ilike('city', city)
      .is('archived_at', null)
    if (country) q = q.ilike('country', country)
    const { data } = await q
      .order('average_rating', { ascending: false, nullsFirst: false })
      .limit(20)

    if (data && data.length > 0) {
      nearbyPlaces      = data.filter((p: any) => p.category === 'eat').slice(0, 6)
      nearbySanctuaries = data.filter((p: any) => p.category === 'organisation').slice(0, 3)
      nearbyStays       = data.filter((p: any) => p.category === 'hotel').slice(0, 3)
    }
  }

  // Resolve the user's city score from city_scores (single indexed lookup) if
  // we still don't have it.
  if (!userCityScore && city) {
    userCityScore = topCities.find(c => c.city.toLowerCase() === city.toLowerCase())
      || await fetchCityScore(supabase, city, country)
  }

  // When the user's city has < 5 places (the scoring threshold), city_scores
  // is empty but directory_cities still has the count. Fetch it so the home
  // UI can show "N place(s) so far — add M more to unlock" instead of the
  // misleading "be the first to add a place" fallback. One indexed lookup.
  let userCityPlaceCount: number | null = null
  if (!userCityScore) {
    // Prefer the city we actually resolved from nearbyPlaces over the query
    // param, since the city param may be stale.
    const resolvedCity = nearbyPlaces[0]?.city || city
    const resolvedCountry = nearbyPlaces[0]?.country || country
    if (resolvedCity) {
      let q = supabase
        .from('directory_cities')
        .select('place_count')
        .ilike('city', resolvedCity)
      if (resolvedCountry) q = q.ilike('country', resolvedCountry)
      const { data: dc } = await q.limit(1)
      if (dc && dc[0]) userCityPlaceCount = (dc[0] as any).place_count
    }
  }

  return NextResponse.json({
    topCities,
    userCityScore,
    userCityPlaceCount,
    nearbyPlaces,
    nearbySanctuaries,
    nearbyStays,
    totalCities,
    totalPlaces,
    stats: {
      totalPlaces,
      fullyVegan: fullyVeganCount,
      restaurants,
      stores,
      stays,
      sanctuaries: sanctuaries || 0,
      countries: totalCountries,
      cities: totalCities,
      citiesRanked,
    },
  }, {
    headers: {
      // Cookieless payload is identical for every guest — let the CDN
      // dedupe concurrent fetches (5min fresh + 1h stale-while-revalidate).
      // Personalised payload is per-user, no shared cache.
      'Cache-Control': isCookieless
        ? 'public, s-maxage=300, stale-while-revalidate=3600'
        : 'private, s-maxage=60, stale-while-revalidate=300',
    },
  })
}

async function fetchCityScore(supabase: any, city: string, country: string) {
  if (!city) return null
  let q = supabase
    .from('city_scores')
    .select('city, country, score, grade, fv_count, place_count, per_capita, center_lat, center_lng')
    .ilike('city', city)
  if (country) q = q.ilike('country', country)
  const { data } = await q.limit(1)
  const r = data?.[0]
  if (!r) return null
  return {
    city: r.city,
    country: r.country,
    score: r.score,
    grade: r.grade,
    fvCount: r.fv_count,
    placeCount: r.place_count,
    perCapita: r.per_capita ?? undefined,
    center: (r.center_lat != null && r.center_lng != null) ? [Number(r.center_lat), Number(r.center_lng)] : undefined,
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
