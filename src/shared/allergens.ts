/**
 * Allergen vocabulary + text matching, shared by web and the mobile app.
 *
 * Single source of truth for three things that used to be duplicated:
 *   - the allergen list offered in the UI (was in AllergenSelector.tsx on web
 *     and preferences.ts on mobile — they happened to agree, by luck)
 *   - the display labels
 *   - the keyword matcher (was private to the barcode API route, so the
 *     ingredient/menu scanners couldn't use it)
 *
 * The `allergen` tag on E-codes (see e-codes.ts) uses this same vocabulary.
 *
 * Deliberately NOT the same axis as vegan status. An allergen hit means "this
 * is unsafe for you", not "this is not vegan" — a product can be perfectly
 * vegan and still contain soy. Keep the two signals separate all the way to
 * the UI.
 */

export const COMMON_ALLERGENS = [
  'gluten',
  'soy',
  'nuts',
  'peanuts',
  'sesame',
  'mustard',
  'celery',
  'lupin',
  'sulphites',
  'corn',
  'nightshades',
  'coconut',
] as const

export type CommonAllergen = (typeof COMMON_ALLERGENS)[number]

export const ALLERGEN_LABEL: Record<string, string> = {
  gluten: 'Gluten / wheat',
  soy: 'Soy',
  nuts: 'Tree nuts',
  peanuts: 'Peanuts',
  sesame: 'Sesame',
  mustard: 'Mustard',
  celery: 'Celery',
  lupin: 'Lupin',
  sulphites: 'Sulphites',
  corn: 'Corn',
  nightshades: 'Nightshades',
  coconut: 'Coconut',
}

/** Display name for an allergen key, falling back to the user's own wording. */
export function labelAllergen(a: string): string {
  return ALLERGEN_LABEL[a] ?? a.charAt(0).toUpperCase() + a.slice(1)
}

/**
 * Keyword sets for detecting allergens in ingredient / menu text. Includes
 * common non-English spellings because labels and menus are often local
 * (soja, arachide, celeri).
 */
export const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  gluten: ['wheat', 'barley', 'rye', 'spelt', 'malt', 'gluten', 'blé', 'ble ', 'weizen', 'farro'],
  soy: ['soy', 'soja', 'soia', 'soybean', 'edamame', 'tofu', 'tempeh'],
  nuts: [
    'almond', 'amande', 'hazelnut', 'noisette', 'walnut', 'pecan', 'cashew',
    'pistachio', 'macadamia', 'brazil nut', 'nuss', 'mandel',
  ],
  peanuts: ['peanut', 'groundnut', 'arachide', 'erdnuss'],
  sesame: ['sesame', 'tahini', 'sesam'],
  mustard: ['mustard', 'moutarde', 'senf'],
  celery: ['celery', 'celeri', 'céleri', 'sellerie'],
  lupin: ['lupin', 'lupine'],
  sulphites: [
    'sulphite', 'sulfite', 'sulphur dioxide', 'sulfur dioxide',
    'e220', 'e221', 'e222', 'e223', 'e224', 'e226', 'e227', 'e228',
  ],
  corn: ['corn ', 'maize', 'cornstarch', 'corn starch', 'high-fructose', 'high fructose', 'maïs', 'mais '],
  nightshades: ['tomato', 'potato', 'pepper', 'eggplant', 'aubergine', 'paprika', 'tomate', 'kartoffel'],
  coconut: ['coconut', 'coco', 'kokos'],
}

/**
 * Which of the user's allergens appear in this text. Unknown (user-typed)
 * allergens fall back to a literal substring match on their own wording.
 *
 * Note this is a plain keyword pass: it does not distinguish "contains milk"
 * from "may contain milk". Precautionary cross-contamination warnings will
 * match. Surface hits as "worth checking", never as a guarantee either way.
 */
export function findAllergenHits(text: string, allergens: string[]): string[] {
  if (!text || !allergens?.length) return []
  const lower = text.toLowerCase()
  const hits = new Set<string>()
  for (const raw of allergens) {
    const a = raw.trim().toLowerCase()
    if (!a) continue
    const known = ALLERGEN_KEYWORDS[a]
    if (known) {
      if (known.some((kw) => lower.includes(kw))) hits.add(a)
    } else if (lower.includes(a)) {
      hits.add(a)
    }
  }
  return Array.from(hits)
}

/** Normalise a user-supplied allergen list for storage or an API call. */
export function normaliseAllergens(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  for (const raw of input) {
    const a = String(raw).trim().toLowerCase()
    if (a.length > 0 && a.length < 40) seen.add(a)
  }
  return Array.from(seen).slice(0, 30)
}
