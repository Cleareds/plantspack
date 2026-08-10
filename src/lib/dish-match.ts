/**
 * Shared dish<->place matching. THE ONE implementation.
 *
 * This logic used to be copy-pasted into `src/lib/dish-page-data.ts` (which
 * renders the page) and `src/app/sitemap/dishes.xml/route.ts` (which decides
 * which dish URLs to submit). They had already drifted — the sitemap copy
 * never applied the `subcategoryHint` bonus — which means the sitemap could
 * advertise a URL the page then refused to render, or omit one it would have.
 * Both now import from here so the gate and the sitemap cannot disagree.
 *
 * SCORING
 *   name          +10   cuisine_types +6
 *   subcategory   +4    description   +4  (see DESCRIPTION_WEIGHT)
 * Gate: >=4 general, >=6 specialised (see minScore).
 *
 * WHY DESCRIPTION IS WEIGHTED 4 AND NOT 2
 *
 * It was 2, which is below BOTH gates — so a place whose only dish evidence
 * was its description could never qualify, no matter how explicit the text.
 * The signal was dead weight. Measured 2026-08-10: raising it to 4 qualifies
 * ~1,500 additional city x dish pages, concentrated in cities that already
 * rank (Düsseldorf, London, Hamburg, Zürich, Munich, Paris, Berlin, Stockholm).
 *
 * WHY BOILERPLATE DESCRIPTIONS ARE EXCLUDED FROM THAT
 *
 * 54% of described places carry a generated fallback from
 * buildFallbackDescription() — "Vegan-friendly restaurant in Berlin, Germany.
 * Imported from OpenStreetMap; details not yet communicated." Those strings
 * contain the venue CATEGORY and the COUNTRY NAME, so at weight 4 they matched
 * en masse: `german-food` alone gained 272 bogus pages purely from the ", Germany"
 * suffix. Excluding template text from the description tier cut the artifact
 * (german-food 272 -> 57) while keeping the genuine gain. Boilerplate still
 * counts for name/cuisine/subcategory tiers — only free-text matching is skipped.
 */
import type { DishDef } from '@/lib/dish-keywords'

/** Description-tier weight. Must be >= the general gate (4) to mean anything. */
export const DESCRIPTION_WEIGHT = 4

/**
 * Needles that must begin at a word boundary. Bare substring matching produced
 * real false positives, each verified against live rows on 2026-08-10:
 *   oats    -> "Dancing Goats Coffee"        pho   -> "SaltFire ... Taphouse"
 *   siam    -> "Asiam"                       isan  -> "Knot Artisan Coffee"
 *   mandu   -> "Kathmandu"                   bio   -> "Macrobiotics India"
 *   berliner-> "Altberliner Imbis"           cake  -> "...pancakes..."
 *   bowl    -> "SuperBowl"                   diner -> Dutch/French "diner" (dinner)
 *
 * Deliberately NOT applied globally: German and brand compounds depend on
 * mid-word matching. "Pizzabrötchen", "Telepizza", "MamaSushi", "Gemüsekebap",
 * "Nudelsuppe" and "Zuckerbäckerei" are all genuine matches that a blanket
 * word-boundary rule would throw away.
 */
const STRICT_NEEDLES = new Set([
  'oats', 'pho', 'siam', 'isan', 'mandu', 'bio', 'berliner', 'cake', 'bowl', 'diner',
])

/**
 * Needles that are trustworthy in a name or a cuisine_types tag but NOT in free
 * text, because they are nationality adjectives that show up in ordinary prose
 * about where a venue is rather than what it serves ("...in Hamburg, Germany",
 * "Latin American influences"). Scoring them from description manufactured
 * cuisine pages out of geography.
 */
const DESCRIPTION_UNSAFE_NEEDLES = new Set(['german', 'american', 'diner'])

const boundaryCache = new Map<string, RegExp>()
function matchesNeedle(haystack: string, needle: string): boolean {
  if (!STRICT_NEEDLES.has(needle)) return haystack.includes(needle)
  let re = boundaryCache.get(needle)
  if (!re) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Unicode-aware: the char before the needle must not be a letter or digit,
    // so "goats" fails `oats` but "Bio-Laden" and "Bowls" still pass.
    re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}`, 'iu')
    boundaryCache.set(needle, re)
  }
  return re.test(haystack)
}

/** Shapes emitted by buildFallbackDescription() and the older OSM importers. */
const BOILERPLATE_PATTERNS: RegExp[] = [
  /^100% vegan .{0,40}(spot|eatery)\b/i,
  /^(mostly |largely )?vegan(-friendly)? [a-z_ ]{0,30}(spot|restaurant|cafe|café|bar|eatery|fast food spot|coffee_shop|place)\b/i,
  /^shop\b.{0,60}(vegan|plant-based)/i,
  /^stay\b.{0,60}vegan/i,
  /^vegan organisation\b/i,
]

/**
 * True when a description is generated filler rather than something a human or
 * an enrichment pass actually wrote about this venue.
 */
export function isBoilerplateDescription(description: string | null | undefined): boolean {
  const s = (description ?? '').trim()
  if (!s) return false
  if (/imported from openstreetmap/i.test(s)) return true
  // Real prose runs long; the generated one-liners do not.
  if (s.length > 180) return false
  return BOILERPLATE_PATTERNS.some(re => re.test(s))
}

export interface MatchablePlace {
  name?: string | null
  description?: string | null
  cuisine_types?: unknown
  subcategory?: string | null
}

export function matchScoreFor(place: MatchablePlace, dish: DishDef): number {
  const name = (place.name ?? '').toLowerCase()
  // cuisine_types is jsonb and occasionally holds null entries from old
  // imports — filter falsy before lowercasing.
  const cuisines = ((place.cuisine_types ?? []) as unknown[])
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
    .map(c => c.toLowerCase())
  const subcat = (place.subcategory ?? '').toLowerCase()
  const rawDesc = place.description ?? ''
  const desc = isBoilerplateDescription(rawDesc) ? '' : rawDesc.toLowerCase()

  let score = 0
  for (const n of dish.needles) {
    const needle = n.toLowerCase()
    if (matchesNeedle(name, needle)) { score += 10; continue }
    if (cuisines.some(c => matchesNeedle(c, needle))) { score += 6; continue }
    if (subcat === needle || matchesNeedle(subcat, needle)) { score += 4; continue }
    if (desc && !DESCRIPTION_UNSAFE_NEEDLES.has(needle) && matchesNeedle(desc, needle)) {
      score += DESCRIPTION_WEIGHT
      continue
    }
  }
  if (dish.subcategoryHint && subcat === dish.subcategoryHint) score += 4
  return score
}

/** Minimum match score to include a place. Tighter for specialised dishes
 *  (a ramen shop, not a place that lists ramen once). */
export function minScore(dish: DishDef): number {
  return dish.specialised ? 6 : 4
}

/** Density gate: a dish page needs this many matching places to exist at all.
 *  The page renderer, the dishes.xml sitemap and the noindex directive all
 *  read this constant so they can never disagree. */
export const DISH_PAGE_MIN_PLACES = 3
