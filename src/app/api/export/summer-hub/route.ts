import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Summer-hub places export endpoint.
 *
 *   GET /api/export/summer-hub
 *
 * Returns the full set of vegan places across every city featured on
 * /vegan-summer-destinations, in one JSON payload. Designed for the
 * same downstream use cases as /api/export/places/<country>: dump,
 * inspect, save locally, hand off to another tool.
 *
 * Implementation notes:
 * - Destination list mirrors what the public hub renders. Keep these
 *   in sync when the hub changes; the duplication is intentional so
 *   the endpoint is standalone (no import from a 'use client' page).
 * - Per-city queries fan out in parallel for speed (29 cities).
 * - 5-minute s-maxage / 1-hour SWR; same cache profile as
 *   /api/export/places/[country] since the data is read-mostly.
 */

const CACHE_HEADERS = {
  'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
  'Content-Type': 'application/json; charset=utf-8',
}

// Same SELECT shape as the country export so callers can treat both
// endpoints interchangeably for analysis.
const PLACE_COLUMNS = [
  'id', 'slug', 'name',
  'category', 'subcategory',
  'address', 'description',
  'images', 'main_image_url',
  'average_rating', 'review_count',
  'is_pet_friendly', 'vegan_level',
  'is_verified',
  'website', 'phone', 'opening_hours',
  'latitude', 'longitude',
  'city', 'country',
  'cuisine_types', 'verification_level',
  'created_at', 'updated_at',
].join(', ')

// Mirror the destinations rendered by /vegan-summer-destinations.
// Kept in code rather than read from the page to keep this endpoint
// independent of the React render path.
const DESTINATIONS: Array<{ city: string; country: string }> = [
  // Italy
  { city: 'Rome', country: 'Italy' },
  { city: 'Florence', country: 'Italy' },
  { city: 'Naples', country: 'Italy' },
  { city: 'Venice', country: 'Italy' },
  { city: 'Palermo', country: 'Italy' },
  { city: 'Catania', country: 'Italy' },
  // Spain
  { city: 'Barcelona', country: 'Spain' },
  { city: 'Madrid', country: 'Spain' },
  { city: 'Valencia', country: 'Spain' },
  { city: 'Ibiza', country: 'Spain' },
  { city: 'Palma de Mallorca', country: 'Spain' },
  { city: 'Santa Cruz de Tenerife', country: 'Spain' },
  // Greece
  { city: 'Athens', country: 'Greece' },
  { city: 'Santorini', country: 'Greece' },
  { city: 'Mykonos', country: 'Greece' },
  { city: 'Naxos', country: 'Greece' },
  { city: 'Corfu', country: 'Greece' },
  { city: 'Heraklion', country: 'Greece' },
  // Portugal
  { city: 'Lisbon', country: 'Portugal' },
  { city: 'Porto', country: 'Portugal' },
  { city: 'Faro', country: 'Portugal' },
  { city: 'Lagos', country: 'Portugal' },
  { city: 'Funchal', country: 'Portugal' },
  // Croatia
  { city: 'Zagreb', country: 'Croatia' },
  { city: 'Split', country: 'Croatia' },
  { city: 'Dubrovnik', country: 'Croatia' },
  { city: 'Pula', country: 'Croatia' },
  // Turkey
  { city: 'Istanbul', country: 'Turkey' },
  { city: 'Antalya', country: 'Turkey' },
]

async function fetchCityPlaces(
  supabase: ReturnType<typeof createAdminClient>,
  city: string,
  country: string,
): Promise<any[]> {
  // Paginate through Supabase's 1000-row cap. None of our hub cities
  // exceeds ~250 places today, but pagination guards against that
  // assumption breaking later.
  const out: any[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('places')
      .select(PLACE_COLUMNS)
      .is('archived_at', null)
      .eq('country', country)
      .eq('city', city)
      .order('name', { ascending: true })
      .range(from, from + 999)
    if (error) throw error
    if (!data || data.length === 0) break
    out.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  return out
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Fan out by city. Each promise resolves to { city, country, places }.
    const cityBundles = await Promise.all(
      DESTINATIONS.map(async (d) => {
        const places = await fetchCityPlaces(supabase, d.city, d.country)
        return { ...d, places }
      }),
    )

    // Flat list + grouped views for caller convenience.
    const flat = cityBundles.flatMap((b) => b.places)
    const by_city = cityBundles.map((b) => ({
      city: b.city,
      country: b.country,
      count: b.places.length,
      fully_vegan_count: b.places.filter((p) => p.vegan_level === 'fully_vegan').length,
      verified_fully_vegan_count: b.places.filter(
        (p) => p.vegan_level === 'fully_vegan' && p.is_verified === true,
      ).length,
      places: b.places,
    }))

    const totals = {
      destinations: DESTINATIONS.length,
      places: flat.length,
      fully_vegan: flat.filter((p) => p.vegan_level === 'fully_vegan').length,
      verified_fully_vegan: flat.filter(
        (p) => p.vegan_level === 'fully_vegan' && p.is_verified === true,
      ).length,
    }

    const body = {
      exported_at: new Date().toISOString(),
      hub: 'vegan-summer-destinations',
      totals,
      by_city,
      places: flat,
    }

    return new NextResponse(JSON.stringify(body), { headers: CACHE_HEADERS })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
