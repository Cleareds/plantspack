import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCities } from '@/lib/directory-queries'
import { getRegionsForCountry } from '@/lib/regions'

// Local copies of the directory route's slug helpers — they aren't exported
// from a shared module and inlining keeps this endpoint self-contained.
function fromSlug(slug: string): string {
  return slug.replace(/-/g, ' ')
}
function fromSlugDisplay(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Temporary public export endpoint.
 *
 *   GET /api/export/places/<country-slug>
 *
 * Returns the full set of vegan places for a country in JSON, plus the
 * cities and regions catalog for the same country. Designed as a single,
 * standalone JSON dump for downstream tooling. Country slug matches the
 * one used at /vegan-places/<country>; e.g. "belgium", "germany".
 *
 * Implementation notes:
 * - Uses the same SELECT shape and slug matching as the directory API's
 *   level=places branch so frontends and exports stay consistent.
 * - Paginated through Supabase's 1000-row cap with a 5000 hard cap to
 *   avoid runaway dumps for the very largest countries (US, India).
 * - 5-minute s-maxage / 1-hour SWR is appropriate since this is a
 *   read-mostly snapshot of public data.
 */

const CACHE_HEADERS = {
  'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
  'Content-Type': 'application/json; charset=utf-8',
}

const PLACE_COLUMNS = [
  'id', 'slug', 'name',
  'category', 'subcategory',
  'address', 'description',
  'images', 'main_image_url',
  'average_rating', 'review_count',
  'is_pet_friendly', 'vegan_level',
  'website', 'phone', 'opening_hours',
  'latitude', 'longitude',
  'city', 'country',
  'cuisine_types', 'verification_level',
  'created_at', 'updated_at',
].join(', ')

interface RouteParams {
  params: Promise<{ country: string }>
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { country } = await params
  if (!country) {
    return NextResponse.json({ error: 'Missing country slug' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()

    // Pull cities + regions in parallel; we'll fetch places below.
    const [{ cities, country: countryName }, regions] = await Promise.all([
      getCities(country),
      getRegionsForCountry(country),
    ])

    // Country-level place list. Same loop used by /api/places/directory
    // so behaviour stays identical (1000-row Supabase cap, 5k hard cap).
    const HARD_CAP = 5000
    const places: any[] = []
    let from = 0
    while (places.length < HARD_CAP) {
      const remaining = HARD_CAP - places.length
      const pageSize = Math.min(1000, remaining)
      const { data, error } = await supabase
        .from('places')
        .select(PLACE_COLUMNS)
        .is('archived_at', null)
        .ilike('country', fromSlug(country))
        .order('name', { ascending: true })
        .range(from, from + pageSize - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      places.push(...data)
      if (data.length < pageSize) break
      from += pageSize
    }

    const dbCountry = places[0]?.country || countryName || fromSlugDisplay(country)

    const body = {
      country: dbCountry,
      country_slug: country,
      exported_at: new Date().toISOString(),
      counts: {
        places: places.length,
        cities: cities.length,
        regions: regions.length,
      },
      cities,
      regions,
      places,
    }

    return new NextResponse(JSON.stringify(body), { headers: CACHE_HEADERS })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
