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
 *
 * Admin extras (not public): ?include=archived,drafts adds archived places
 * (`archived_places`) and research drafts from place_staging with
 * raw.draft=true (`drafts`). Needs `Authorization: Bearer <CRON_SECRET>` or
 * `?key=<CRON_SECRET>`; the response is then never cached.
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

const ARCHIVED_EXTRA_COLUMNS = ', archived_at, archived_reason, verification_method, source'

const DRAFT_COLUMNS = [
  'id', 'source', 'source_id', 'name',
  'latitude', 'longitude', 'city', 'country', 'address',
  'website', 'categories', 'vegan_level', 'vegan_evidence',
  'decision', 'decision_reason', 'raw', 'created_at',
].join(', ')

const HARD_CAP = 5000

// Pages through Supabase's 1000-row cap up to HARD_CAP rows.
async function fetchAll(
  query: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: unknown }>,
): Promise<any[]> {
  const rows: any[] = []
  let from = 0
  while (rows.length < HARD_CAP) {
    const pageSize = Math.min(1000, HARD_CAP - rows.length)
    const { data, error } = await query(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return rows
}

interface RouteParams {
  params: Promise<{ country: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { country } = await params
  if (!country) {
    return NextResponse.json({ error: 'Missing country slug' }, { status: 400 })
  }

  const include = new Set(
    (req.nextUrl.searchParams.get('include') || '').split(',').map(s => s.trim()).filter(Boolean),
  )
  const isAdminExport = include.size > 0
  if (isAdminExport) {
    const secret = process.env.CRON_SECRET
    const key = req.nextUrl.searchParams.get('key')
      || req.headers.get('authorization')?.replace(/^Bearer /, '')
    if (!secret || key !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const supabase = createAdminClient()

    // Pull cities + regions in parallel; we'll fetch places below.
    const [{ cities, country: countryName }, regions] = await Promise.all([
      getCities(country),
      getRegionsForCountry(country),
    ])

    // Country-level place list. Same paging as /api/places/directory
    // so behaviour stays identical (1000-row Supabase cap, 5k hard cap).
    const places = await fetchAll((from, to) => supabase
      .from('places')
      .select(PLACE_COLUMNS)
      .is('archived_at', null)
      .ilike('country', fromSlug(country))
      .order('name', { ascending: true })
      .range(from, to))

    const archivedPlaces = include.has('archived')
      ? await fetchAll((from, to) => supabase
        .from('places')
        .select(PLACE_COLUMNS + ARCHIVED_EXTRA_COLUMNS)
        .not('archived_at', 'is', null)
        .ilike('country', fromSlug(country))
        .order('name', { ascending: true })
        .range(from, to))
      : null

    const drafts = include.has('drafts')
      ? await fetchAll((from, to) => supabase
        .from('place_staging')
        .select(DRAFT_COLUMNS)
        .eq('raw->>draft', 'true')
        .ilike('country', fromSlug(country))
        .order('name', { ascending: true })
        .range(from, to))
      : null

    const dbCountry = places[0]?.country || countryName || fromSlugDisplay(country)

    const body = {
      country: dbCountry,
      country_slug: country,
      exported_at: new Date().toISOString(),
      // ODbL attribution travels with the data. This endpoint redistributes a
      // database most of whose records derive from OpenStreetMap, so anyone
      // consuming the JSON gets the credit and the licence terms with it.
      attribution: '\u00a9 OpenStreetMap contributors',
      license: 'ODbL-1.0',
      license_url: 'https://opendatacommons.org/licenses/odbl/1-0/',
      attribution_url: 'https://www.plantspack.com/legal/attribution',
      counts: {
        places: places.length,
        cities: cities.length,
        regions: regions.length,
        ...(archivedPlaces && { archived_places: archivedPlaces.length }),
        ...(drafts && { drafts: drafts.length }),
      },
      cities,
      regions,
      places,
      ...(archivedPlaces && { archived_places: archivedPlaces }),
      ...(drafts && { drafts }),
    }

    const headers = isAdminExport
      ? { ...CACHE_HEADERS, 'Cache-Control': 'private, no-store' }
      : CACHE_HEADERS
    return new NextResponse(JSON.stringify(body), { headers })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
