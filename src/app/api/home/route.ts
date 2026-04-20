import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const revalidate = 3600 // cache for 5 minutes

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const city = searchParams.get('city') || ''
  const country = searchParams.get('country') || ''

  // Fetch city scores (all cities — server-side, cached)
  let allPlaces: any[] = []
  let offset = 0
  while (true) {
    const { data } = await supabase
      .from('places')
      .select('city, country, vegan_level, category, average_rating')
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    allPlaces.push(...data)
    offset += 1000
    if (data.length < 1000) break
  }

  // Load population data
  let populations: Record<string, number> = {}
  try {
    const fs = await import('fs')
    const path = await import('path')
    const filePath = path.join(process.cwd(), 'public/data/city-populations.json')
    populations = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {}

  // Calculate city scores
  const byCity: Record<string, any[]> = {}
  for (const p of allPlaces) {
    if (!p.city) continue
    const key = `${p.city}|||${p.country}`
    if (!byCity[key]) byCity[key] = []
    byCity[key].push(p)
  }

  const cityScores = Object.entries(byCity)
    .map(([key, ps]) => {
      const [cityName, country] = key.split('|||')
      const fv = ps.filter(p => p.vegan_level === 'fully_vegan')
      const fvCount = fv.length
      const pop = populations[key]

      let accessibility = 0
      let perCapita: number | undefined
      if (pop && pop > 0) {
        perCapita = (fvCount / pop) * 100000
        accessibility = Math.min(20, perCapita * 4)
      } else {
        accessibility = Math.min(20, fvCount >= 3 ? 10 : fvCount * 4)
      }
      const choice = Math.min(20, fvCount > 0 ? 7 * Math.log2(fvCount + 1) : 0)
      const fvCats = new Set(fv.map(p => p.category))
      const variety = Math.min(30,
        (fvCats.has('eat') ? 12 : 0) + (fvCats.has('store') ? 8 : 0) +
        (fvCats.has('hotel') ? 6 : 0) + (fvCats.has('event') ? 4 : 0)
      )
      const ratedFv = fv.filter(p => p.average_rating && p.average_rating > 0)
      const avgRating = ratedFv.length > 0 ? ratedFv.reduce((s: number, p: any) => s + p.average_rating, 0) / ratedFv.length : 0
      const reviewCoverage = ratedFv.length / Math.max(1, fvCount)
      const quality = Math.min(30, (avgRating / 5) * 20 + reviewCoverage * 10)

      const score = Math.round(Math.min(100, accessibility + choice + variety + quality))
      const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F'

      return { city: cityName, country, score, grade, fvCount, placeCount: ps.length, perCapita }
    })
    .sort((a, b) => b.score - a.score)

  // Get nearby places if location provided
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
      .limit(100)

    if (data) {
      const withDist = data.map(p => ({
        ...p,
        distance: Math.round(haversine(lat, lng, p.latitude, p.longitude) * 10) / 10
      })).sort((a, b) => a.distance - b.distance)

      nearbyPlaces = withDist.filter(p => p.category === 'eat').slice(0, 6)
      nearbySanctuaries = withDist.filter(p => p.category === 'organisation').slice(0, 3)
      nearbyStays = withDist.filter(p => p.category === 'hotel').slice(0, 3)

      // Find user city score
      if (withDist[0]) {
        userCityScore = cityScores.find(c => c.city === withDist[0].city) || null
      }
    }
  }

  // Fallback: fetch places by city name when no coordinates.
  // Filter by country too if provided — otherwise "Oxford" could match UK OR NZ.
  if (nearbyPlaces.length === 0 && city) {
    let q = supabase
      .from('places')
      .select('id, name, slug, category, vegan_level, main_image_url, images, latitude, longitude, city, country, average_rating, review_count')
      .ilike('city', city)
    if (country) q = q.ilike('country', country)
    const { data } = await q
      .order('average_rating', { ascending: false, nullsFirst: false })
      .limit(20)

    if (data && data.length > 0) {
      nearbyPlaces = data.filter(p => p.category === 'eat').slice(0, 6)
      nearbySanctuaries = data.filter(p => p.category === 'organisation').slice(0, 3)
      nearbyStays = data.filter(p => p.category === 'hotel').slice(0, 3)
    }
  }

  // Match city score by name
  if (!userCityScore && city) {
    userCityScore = cityScores.find(c => c.city.toLowerCase() === city.toLowerCase()) || null
  }

  // Platform stats
  const cats: Record<string, number> = {}
  const countries = new Set<string>()
  let fullyVeganCount = 0
  for (const p of allPlaces) {
    cats[p.category] = (cats[p.category] || 0) + 1
    if (p.country) countries.add(p.country)
    if (p.vegan_level === 'fully_vegan') fullyVeganCount++
  }

  return NextResponse.json({
    topCities: cityScores.slice(0, 8),
    userCityScore,
    nearbyPlaces,
    nearbySanctuaries,
    nearbyStays,
    totalCities: cityScores.length,
    totalPlaces: allPlaces.length,
    stats: {
      totalPlaces: allPlaces.length,
      fullyVegan: fullyVeganCount,
      restaurants: cats['eat'] || 0,
      stores: cats['store'] || 0,
      stays: cats['hotel'] || 0,
      sanctuaries: cats['organisation'] || 0,
      countries: countries.size,
      cities: cityScores.length,
    },
  })
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
