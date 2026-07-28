/**
 * Resolve a `/vegan-places/{country}/{city}` URL pair to the display-cased
 * city + country names stored on `places`.
 *
 * Why this exists
 * ---------------
 * Two different slug alphabets are in play and they do not agree:
 *
 *  - `directory_cities.city_slug` is built in SQL with `unaccent()`, which
 *    only covers part of Latin. It folds `Düsseldorf` -> `dusseldorf` but
 *    mangles anything it has no rule for: `Thủ Đức` -> `th-c`,
 *    `Hội An Tây Ward` -> `h-i-an-tay-ward`, `Beyoğlu` -> `beyo-lu`.
 *    Every internal link and sitemap entry uses this value, so it has to keep
 *    resolving.
 *
 *  - `toSlug()` in @/lib/slug transliterates properly: `thu-duc`,
 *    `hoi-an-tay-ward`, `beyoglu`. This is what the middleware 301s accented
 *    inbound URLs to, and the readable form we want to serve.
 *
 * Callers used to sidestep both by doing `.ilike('city', slug.replace(/-/g, ' '))`,
 * which only ever matches cities whose names are already ASCII. That silently
 * 404'd the dish + best-vegan pages for all 58 accented cities in the corpus
 * (São Paulo, Düsseldorf, Münster, Malmö, Liège, ... ~1,020 places).
 *
 * This resolver accepts either alphabet and returns the exact stored names, so
 * queries can use `.eq()` instead of guessing at a pattern.
 */
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase-admin'
import { toSlug } from '@/lib/slug'

export interface ResolvedCity {
  /** City name exactly as stored on `places.city`. */
  city: string
  /** Country name exactly as stored on `places.country`. */
  country: string
  /** SQL-side slug this city is linked as elsewhere on the site. */
  citySlug: string
}

/** Compact wire form: [city_slug, city, country]. */
type CityTuple = [string, string, string]

/**
 * One pass over `directory_cities` (~11K rows), reduced to one tuple per
 * (country, city_slug). Cached for 24h and shared across every city, dish and
 * best-vegan render, so a page regeneration does not re-scan the view.
 */
const getCityTuples = unstable_cache(
  async (): Promise<CityTuple[]> => {
    const sb = createAdminClient()
    const rows: { city: string; country: string; city_slug: string; place_count: number }[] = []
    const PAGE = 1000
    // Supabase caps every read at 1000 rows. Ordering is deterministic and this
    // is a read-only snapshot of a view, so range paging is safe here.
    for (let from = 0; from < 60_000; from += PAGE) {
      const { data, error } = await sb
        .from('directory_cities')
        .select('city, country, city_slug, place_count')
        .order('city_slug', { ascending: true })
        .order('country', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) throw error
      if (!data?.length) break
      rows.push(...(data as typeof rows))
      if (data.length < PAGE) break
    }

    // Casing/accent variants can collide on one (country, city_slug) key; the
    // variant carrying the most places wins, matching getCityPlacesDirect().
    const best = new Map<string, { row: (typeof rows)[number] }>()
    for (const r of rows) {
      if (!r.city || !r.country || !r.city_slug) continue
      const key = `${toSlug(r.country)}|${r.city_slug}`
      const cur = best.get(key)
      if (!cur || r.place_count > cur.row.place_count) best.set(key, { row: r })
    }
    return [...best.values()].map(({ row }) => [row.city_slug, row.city, row.country] as CityTuple)
  },
  ['directory-city-index-v1'],
  { revalidate: 86400 },
)

interface CityIndex {
  /** `${countrySlug}|${city_slug}` -> city (the SQL-side slug). */
  bySlug: Map<string, ResolvedCity>
  /** `${countrySlug}|${toSlug(city)}` -> city (the transliterated slug). */
  byFold: Map<string, ResolvedCity>
}

/** react cache(): build the lookup maps at most once per render. */
const getCityIndex = cache(async function getCityIndex(): Promise<CityIndex> {
  const bySlug = new Map<string, ResolvedCity>()
  const byFold = new Map<string, ResolvedCity>()
  let tuples: CityTuple[] = []
  try {
    tuples = await getCityTuples()
  } catch (e) {
    console.error('[city-resolve] city index fetch failed:', (e as Error)?.message)
    return { bySlug, byFold }
  }
  for (const [citySlug, city, country] of tuples) {
    const countryKey = toSlug(country)
    const resolved: ResolvedCity = { city, country, citySlug }
    bySlug.set(`${countryKey}|${citySlug}`, resolved)
    // Never let the transliterated alphabet shadow a real city_slug.
    const foldKey = `${countryKey}|${toSlug(city)}`
    if (!byFold.has(foldKey)) byFold.set(foldKey, resolved)
  }
  return { bySlug, byFold }
})

/**
 * Resolve a country+city slug pair from a URL. Accepts the SQL `city_slug`
 * (what our links use) or the transliterated `toSlug(city)` form (what the
 * middleware redirects accented URLs to). Returns null when neither matches.
 */
export const resolveCity = cache(async function resolveCity(
  countrySlug: string,
  citySlug: string,
): Promise<ResolvedCity | null> {
  if (!countrySlug || !citySlug) return null
  const { bySlug, byFold } = await getCityIndex()
  const countryKey = toSlug(countrySlug)
  const wanted = citySlug.toLowerCase()
  return (
    bySlug.get(`${countryKey}|${wanted}`) ??
    byFold.get(`${countryKey}|${toSlug(citySlug)}`) ??
    null
  )
})

/**
 * The `city_slug` value that rows in `city_experiences` /
 * `city_experiences_summary` and the directory views are keyed by.
 *
 * Those tables store whatever slug the URL carried when the row was written,
 * which historically was always the SQL `city_slug`. Route params can now also
 * arrive in the transliterated alphabet (the middleware folds accented inbound
 * URLs, and link builders emit the readable form), so every lookup against a
 * `city_slug` column has to come through here or it silently misses rows.
 *
 * Falls back to the input for cities the directory view has not picked up yet.
 */
export const canonicalCitySlug = cache(async function canonicalCitySlug(
  countrySlug: string,
  citySlug: string,
): Promise<string> {
  const loc = await resolveCity(countrySlug, citySlug)
  return loc?.citySlug ?? citySlug.toLowerCase()
})
