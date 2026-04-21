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

  // Three independent queries — run in parallel.
  const [topCitiesPromise, countryAggPromise, cityCountPromise] = await Promise.all([
    // Top 8 cities by score — full row from city_scores so we can return it
    // directly (no in-JS computation).
    supabase
      .from('city_scores')
      .select('city, country, score, grade, fv_count, place_count, per_capita, center_lat, center_lng')
      .order('score', { ascending: false })
      .limit(8),
    // Platform stats aggregate — 177 rows, aggregates summed in JS.
    supabase
      .from('directory_countries')
      .select('country, place_count, eat_count, store_count, hotel_count, fully_vegan_count'),
    // Total cities with places — from directory_cities.
    supabase
      .from('directory_cities')
      .select('*', { count: 'exact', head: true }),
  ])

  const topCitiesRaw = topCitiesPromise.data || []
  const countryRows = countryAggPromise.data || []
  const totalCities = cityCountPromise.count || 0

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

  // Aggregate platform stats from the 177 country rows (fast in JS).
  let totalPlaces = 0, fullyVeganCount = 0, restaurants = 0, stores = 0, stays = 0
  for (const r of countryRows as any[]) {
    totalPlaces += r.place_count || 0
    fullyVeganCount += r.fully_vegan_count || 0
    restaurants += r.eat_count || 0
    stores += r.store_count || 0
    stays += r.hotel_count || 0
  }

  // Sanctuaries (category='organisation') isn't broken out in directory_countries.
  // Count it with a single lightweight aggregate query.
  const { count: sanctuaries } = await supabase
    .from('places')
    .select('id', { count: 'exact', head: true })
    .eq('category', 'organisation')
    .is('archived_at', null)

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

  return NextResponse.json({
    topCities,
    userCityScore,
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
      countries: countryRows.length,
      cities: totalCities,
    },
  }, {
    headers: {
      // Short edge cache — we serve location-aware data per cookie, so SWR
      // lets the CDN hand back cached shapes quickly while regenerating.
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
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
