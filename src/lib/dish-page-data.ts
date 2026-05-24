// Server-side query + scoring for dish×city pages.
// Used by /vegan-places/[country]/[city]/best-vegan-[dish]/page.tsx.

import { createClient } from '@supabase/supabase-js'
import { DISH_BY_SLUG, type DishDef } from './dish-keywords'
import { getConfidenceBadge, confidenceTierRank, type ConfidenceBadge } from './verification-badge'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

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

function matchScoreFor(place: any, dish: DishDef): number {
  const name = (place.name ?? '').toLowerCase()
  const desc = (place.description ?? '').toLowerCase()
  // cuisine_types is jsonb in the DB and occasionally contains null entries
  // (legacy data from old imports). Filter falsy before lowercasing.
  const cuisines = ((place.cuisine_types ?? []) as unknown[])
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
    .map(c => c.toLowerCase())
  const subcat = (place.subcategory ?? '').toLowerCase()
  let score = 0
  for (const n of dish.needles) {
    const needle = n.toLowerCase()
    if (name.includes(needle)) { score += 10; continue }
    if (cuisines.some(c => c.includes(needle))) { score += 6; continue }
    if (subcat === needle || subcat.includes(needle)) { score += 4; continue }
    if (desc.includes(needle)) { score += 2; continue }
  }
  if (dish.subcategoryHint && subcat === dish.subcategoryHint) score += 4
  return score
}

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

/** Minimum match score to include a place. Tighter for specialised dishes
 *  (donut, ramen, falafel) to avoid false positives from broad menus. */
function minScore(dish: DishDef): number {
  return dish.specialised ? 6 : 4
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

  const country = countrySlug.replace(/-/g, ' ')
  const city = citySlug.replace(/-/g, ' ')
  console.log(`[dish] enter ${dishSlug} country="${country}" city="${city}" env=${!!process.env.SUPABASE_SERVICE_ROLE_KEY ? 'KEY_OK' : 'NO_KEY'}`)

  const { data, error } = await sb.from('places')
    .select(`
      id, slug, name, city, country, address, description, main_image_url,
      vegan_level, category, subcategory, cuisine_types, average_rating,
      review_count, is_verified, verification_level, verification_method,
      source, created_by, tags
    `)
    .ilike('country', country)
    .ilike('city', city)
    .is('archived_at', null)
    .limit(2000)

  console.log(`[dish] query result for ${dishSlug}/${city}: ${data?.length || 0} rows, error=${error?.message || 'none'}`)

  if (error) return null
  if (!data?.length) return null

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

  console.log(`[dish] scored ${dishSlug}/${city}: ${scored.length} of ${data.length} rows match`)
  if (scored.length < 3) return null

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
  // Pull all places once, score against every dish
  const { data } = await sb.from('places')
    .select('name, description, cuisine_types, subcategory')
    .ilike('country', country.replace(/-/g, ' '))
    .ilike('city', city.replace(/-/g, ' '))
    .is('archived_at', null)
    .limit(2000)
  if (!data?.length) return []

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
    .filter(([, n]) => n >= 3)
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
  const { data } = await sb.from('places')
    .select('name, description, cuisine_types, subcategory, city, country')
    .ilike('country', country.replace(/-/g, ' '))
    .not('city', 'is', null)
    .is('archived_at', null)
    .limit(5000)
  if (!data?.length) return []

  const byCity: Record<string, { country: string; count: number }> = {}
  for (const p of data) {
    if (!p.city) continue
    if (p.city.toLowerCase() === excludeCity.replace(/-/g, ' ').toLowerCase()) continue
    const score = matchScoreFor(p, dish)
    if (score >= minScore(dish)) {
      const key = p.city
      if (!byCity[key]) byCity[key] = { country: p.country || country, count: 0 }
      byCity[key].count++
    }
  }
  return Object.entries(byCity)
    .filter(([, v]) => v.count >= 3)
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
  const c = country.toLowerCase().replace(/\s+/g, '-')
  const ci = city.toLowerCase().replace(/\s+/g, '-')
  return `/vegan-places/${c}/${ci}/best-vegan/${dishSlug}`
}
