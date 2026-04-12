import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

// Weekly OSM diff scraper — finds new/changed vegan places worldwide
// Runs every Sunday at 5:00 AM UTC
export const runtime = 'nodejs'
export const maxDuration = 60

const OVERPASS_API = 'https://overpass-api.de/api/interpreter'

// Fetch vegan places added/modified in the last 8 days from OSM
async function fetchOsmVeganPlaces(): Promise<any[]> {
  // Query for places with diet:vegan=yes or diet:vegan=only, changed in last 8 days
  const query = `
    [out:json][timeout:55];
    (
      node["diet:vegan"~"yes|only"](newer:"{{date:8 days}}");
      way["diet:vegan"~"yes|only"](newer:"{{date:8 days}}");
    );
    out center meta;
  `.replace('{{date:8 days}}', new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0] + 'T00:00:00Z')

  const res = await fetch(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })

  if (!res.ok) throw new Error(`Overpass API error: ${res.status}`)
  const data = await res.json()
  return data.elements || []
}

function categorizePlace(tags: Record<string, string>): { category: string; subcategory: string } {
  const amenity = tags.amenity || ''
  const shop = tags.shop || ''
  const tourism = tags.tourism || ''

  if (['restaurant', 'food_court'].includes(amenity)) return { category: 'eat', subcategory: 'restaurant' }
  if (amenity === 'cafe') return { category: 'eat', subcategory: 'cafe' }
  if (amenity === 'fast_food') return { category: 'eat', subcategory: 'fast_food' }
  if (['bar', 'pub', 'biergarten'].includes(amenity)) return { category: 'eat', subcategory: 'bar' }
  if (amenity === 'ice_cream') return { category: 'eat', subcategory: 'ice_cream' }
  if (['supermarket', 'convenience', 'greengrocer', 'organic'].includes(shop)) return { category: 'store', subcategory: 'grocery' }
  if (shop === 'health_food') return { category: 'store', subcategory: 'health_food' }
  if (['bakery'].includes(shop) || amenity === 'bakery') return { category: 'store', subcategory: 'bakery' }
  if (['hotel', 'motel', 'guest_house'].includes(tourism)) return { category: 'hotel', subcategory: 'hotel' }
  if (tourism === 'hostel') return { category: 'hotel', subcategory: 'hostel' }
  if (shop) return { category: 'store', subcategory: 'grocery' }
  if (amenity) return { category: 'eat', subcategory: 'restaurant' }
  return { category: 'other', subcategory: 'other' }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    // 1. Fetch recent OSM changes
    const osmPlaces = await fetchOsmVeganPlaces()

    if (osmPlaces.length === 0) {
      return NextResponse.json({ newPlaces: 0, updatedPlaces: 0, message: 'No recent OSM changes' })
    }

    // 2. Get existing places from DB for dedup (by coordinates)
    let existing: any[] = []
    let offset = 0
    while (true) {
      const { data } = await supabase
        .from('places')
        .select('id, name, latitude, longitude')
        .range(offset, offset + 999)
      if (!data || data.length === 0) break
      existing.push(...data)
      offset += 1000
      if (data.length < 1000) break
    }

    const existingSet = new Set(
      existing.map(p => `${Math.round(p.latitude * 1000)}|${Math.round(p.longitude * 1000)}`)
    )

    // 3. Classify new vs existing
    let newPlaces = 0
    let alreadyExists = 0
    const candidates: any[] = []

    for (const el of osmPlaces) {
      const lat = el.type === 'way' ? el.center?.lat : el.lat
      const lng = el.type === 'way' ? el.center?.lon : el.lon
      if (!lat || !lng) continue

      const tags = el.tags || {}
      const name = tags.name || tags['name:en']
      if (!name) continue

      const coordKey = `${Math.round(lat * 1000)}|${Math.round(lng * 1000)}`
      if (existingSet.has(coordKey)) {
        alreadyExists++
        continue
      }

      const { category, subcategory } = categorizePlace(tags)
      const veganLevel = tags['diet:vegan'] === 'only' ? 'fully_vegan' : 'vegan_friendly'

      // Build opening hours string
      const openingHours = tags.opening_hours || null

      candidates.push({
        osm_id: el.id,
        name,
        latitude: lat,
        longitude: lng,
        category,
        subcategory,
        vegan_level: veganLevel,
        website: tags.website || tags['contact:website'] || null,
        phone: tags.phone || tags['contact:phone'] || null,
        opening_hours: openingHours,
        address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:postcode'], tags['addr:city']]
          .filter(Boolean).join(', ') || null,
        city: tags['addr:city'] || null,
        country: null, // Would need reverse geocoding
        tags: el.tags,
      })
      newPlaces++
    }

    // 4. Store candidates in a staging table or log them
    // For now, store as a JSON report in Supabase storage
    const report = {
      generatedAt: new Date().toISOString(),
      osmChangesTotal: osmPlaces.length,
      alreadyInDb: alreadyExists,
      newCandidates: newPlaces,
      candidates: candidates.slice(0, 500), // Cap at 500 for storage
    }

    // Store report in Supabase storage for review
    const reportBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const fileName = `osm-sync/report-${new Date().toISOString().split('T')[0]}.json`
    await supabase.storage
      .from('backups')
      .upload(fileName, reportBlob, { upsert: true })

    return NextResponse.json({
      osmChanges: osmPlaces.length,
      alreadyInDb: alreadyExists,
      newCandidates: newPlaces,
      reportFile: fileName,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[OSM Sync] Error:', error)
    return NextResponse.json(
      { error: 'OSM sync failed', details: String(error) },
      { status: 500 }
    )
  }
}
