// Server-side query + scoring for dish×city pages.
// Used by /vegan-places/[country]/[city]/best-vegan-[dish]/page.tsx.

import { createClient } from '@supabase/supabase-js'
import { DISH_BY_SLUG, type DishDef } from './dish-keywords'
import { matchScoreFor, minScore, DISH_PAGE_MIN_PLACES } from './dish-match'
import { getConfidenceBadge, confidenceTierRank, type ConfidenceBadge } from './verification-badge'
import { resolveCity } from './city-resolve'
import { toSlug } from './slug'
import { log } from './logger'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

/**
 * PostgREST caps every response at 1000 rows regardless of the `.limit()` you
 * ask for — `.limit(2000)` silently returns 1000 and reports no error.
 *
 * That silently broke dish pages in the two cities that matter most. Berlin has
 * 1,781 live places and London 1,247, so 781 and 247 places respectively were
 * invisible to every dish page, chip grid and nearby-city list in our #1 and #2
 * markets by clicks. `dishes.xml` paginates properly, so the sitemap counted a
 * dish over the >=3 gate while the page — scoring a truncated 1000-row slice —
 * found fewer and returned 404. That is the source of the 404 the URL
 * Inspection sample caught on /vegan-places/germany/berlin/best-vegan/ethiopian.
 *
 * getNearbyDishCities was worse: it pulls a whole COUNTRY with .limit(5000),
 * so for Germany it was ranking "nearby cities" off an arbitrary 1000-row slice.
 *
 * Always page through with .range(). Never trust .limit() above 1000.
 */
async function fetchAllRows<T>(select: string, filters: (q: any) => any): Promise<T[]> {
  const PAGE = 1000
  const out: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await filters(sb.from('places').select(select)).range(from, from + PAGE - 1)
    if (error) {
      log.debug(`[dish] paged fetch failed at offset ${from}: ${error.message}`)
      break
    }
    if (!data?.length) break
    out.push(...(data as T[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return out
}

export interface DishPlace {
  id: string
  slug: string | null
  name: string
  city: string | null
  country: string | null
  address: string | null
  description: string | null
  main_image_url: string | null
  vegan_level: string | null
  category: string | null
  subcategory: string | null
  cuisine_types: string[] | null
  average_rating: number | null
  review_count: number | null
  is_verified: boolean | null
  verification_level: number | null
  verification_method: string | null
  source: string | null
  created_by: string | null
  tags: string[] | null
  /** Computed: 0-N total match score against the dish */
  matchScore: number
  /** Final ranking score combining match + rating + verification + vegan tier */
  rankScore: number
  /** Confidence badge for the place */
  badge: ConfidenceBadge
}

// matchScoreFor / minScore now live in ./dish-match so this file and
// sitemap/dishes.xml score identically — see that module for the rationale.

function veganLevelBonus(vl: string | null): number {
  switch (vl) {
    case 'fully_vegan': return 15
    case 'mostly_vegan': return 8
    case 'vegan_friendly': return 3
    case 'vegan_options': return 0
    default: return 0
  }
}

function ratingBonus(rating: number | null, count: number | null): number {
  const r = rating ?? 0
  const c = count ?? 0
  if (!c) return 0
  // Wilson-confidence-style: rating × log(1+count), capped
  return Math.min(15, r * Math.log(1 + c) * 0.4)
}

function confidenceBonus(badge: ConfidenceBadge): number {
  return badge.tier === 'high' ? 20 : badge.tier === 'mid' ? 8 : 0
}

export interface DishPageData {
  dish: DishDef
  city: string
  country: string
  places: DishPlace[]
  total: number
  fullyVeganCount: number
}

/**
 * Fetch + rank places matching a dish in a city.
 * Returns null if no matches OR fewer than 3 places (density gate).
 */
export async function getDishPageData(
  dishSlug: string,
  countrySlug: string,
  citySlug: string,
): Promise<DishPageData | null> {
  const dish = DISH_BY_SLUG[dishSlug]
  if (!dish) return null

  // Resolve the slug pair to the stored city/country names. The old
  // `citySlug.replace(/-/g, ' ')` guess only matched cities that are already
  // ASCII, so every accented city (São Paulo, Düsseldorf, Thủ Đức, ...) 404'd
  // here regardless of how many matching places it had.
  const loc = await resolveCity(countrySlug, citySlug)
  if (!loc) return null
  const { city, country } = loc
  log.debug(`[dish] enter ${dishSlug} country="${country}" city="${city}"`)

  const data = await fetchAllRows<any>(
    `id, slug, name, city, country, address, description, main_image_url,
     vegan_level, category, subcategory, cuisine_types, average_rating,
     review_count, is_verified, verification_level, verification_method,
     source, created_by, tags`,
    q => q.ilike('country', country).ilike('city', city).is('archived_at', null),
  )

  log.debug(`[dish] query result for ${dishSlug}/${city}: ${data.length} rows`)

  if (!data.length) return null

  const scored: DishPlace[] = []
  for (const p of data) {
    const ms = matchScoreFor(p, dish)
    if (ms < minScore(dish)) continue
    const badge = getConfidenceBadge(p)
    const rankScore = ms
      + veganLevelBonus(p.vegan_level)
      + ratingBonus(p.average_rating, p.review_count)
      + confidenceBonus(badge)
    scored.push({ ...p, matchScore: ms, rankScore, badge })
  }

  log.debug(`[dish] scored ${dishSlug}/${city}: ${scored.length} of ${data.length} rows match`)
  if (scored.length < DISH_PAGE_MIN_PLACES) return null

  // Sort by composite rank
  scored.sort((a, b) => b.rankScore - a.rankScore)

  const fullyVeganCount = scored.filter(p => p.vegan_level === 'fully_vegan').length

  // Resolve canonical city + country names (first match wins)
  const resolvedCity = scored[0]?.city || city
  const resolvedCountry = scored[0]?.country || country

  return {
    dish,
    city: resolvedCity,
    country: resolvedCountry,
    places: scored,
    total: scored.length,
    fullyVeganCount,
  }
}

/**
 * For city pages: which dishes have >=3 places in this city, ordered by yield.
 * Used to populate the "best vegan X in {city}" chip grid on city pages.
 */
export async function getCityDishChips(country: string, city: string): Promise<{ slug: string; label: string; count: number }[]> {
  const loc = await resolveCity(country, city)
  if (!loc) return []
  // Pull all places once, score against every dish
  const data = await fetchAllRows<any>(
    'name, description, cuisine_types, subcategory, category',
    q => q.ilike('country', loc.country).ilike('city', loc.city).is('archived_at', null),
  )
  if (!data.length) return []

  const counts: Record<string, number> = {}
  for (const p of data) {
    for (const dish of Object.values(DISH_BY_SLUG)) {
      const score = matchScoreFor(p, dish)
      if (score >= minScore(dish)) {
        counts[dish.slug] = (counts[dish.slug] || 0) + 1
      }
    }
  }

  return Object.entries(counts)
    .filter(([, n]) => n >= DISH_PAGE_MIN_PLACES)
    .map(([slug, count]) => ({ slug, label: DISH_BY_SLUG[slug].label, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * For dish pages: same dish in nearby cities (top 5).
 * Used as internal-linking footer.
 */
export async function getNearbyDishCities(
  dishSlug: string,
  country: string,
  excludeCity: string,
  limit = 6,
): Promise<{ city: string; country: string; count: number }[]> {
  const dish = DISH_BY_SLUG[dishSlug]
  if (!dish) return []
  // Pull all places in the country, count dish matches per city
  const data = await fetchAllRows<any>(
    'name, description, cuisine_types, subcategory, category, city, country',
    q => q.ilike('country', country.replace(/-/g, ' ')).not('city', 'is', null).is('archived_at', null),
  )
  if (!data.length) return []

  const byCity: Record<string, { country: string; count: number }> = {}
  // Compare on the slug form so the current city is excluded even when its name
  // is accented — `'Thủ Đức'.toLowerCase() === 'thu duc'` was never true, so the
  // page listed itself under "nearby cities".
  const excludeKey = toSlug(excludeCity)
  for (const p of data) {
    if (!p.city) continue
    if (toSlug(p.city) === excludeKey) continue
    const score = matchScoreFor(p, dish)
    if (score >= minScore(dish)) {
      const key = p.city
      if (!byCity[key]) byCity[key] = { country: p.country || country, count: 0 }
      byCity[key].count++
    }
  }
  return Object.entries(byCity)
    .filter(([, v]) => v.count >= DISH_PAGE_MIN_PLACES)
    .map(([city, v]) => ({ city, country: v.country, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/** Build the canonical href for a dish page. URL pattern:
 *    /vegan-places/{country}/{city}/best-vegan/{dish}
 *  Defensive against undefined args - returns `/` rather than crashing
 *  the metadata function. */
export function dishPageHref(country: string | undefined, city: string | undefined, dishSlug: string | undefined): string {
  if (!country || !city || !dishSlug) return '/'
  // toSlug (not a bare whitespace swap): accepts either a display name
  // ("São Paulo") or an already-slugged param, and always emits ASCII. The old
  // lowercase-and-hyphenate produced `/vegan-places/vietnam/hội-an-tây-ward/...`
  // hrefs, which are the URLs that ended up 500ing in GSC.
  return `/vegan-places/${toSlug(country)}/${toSlug(city)}/best-vegan/${dishSlug}`
}
