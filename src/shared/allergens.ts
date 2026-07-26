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
  gluten: ['wheat', 'barley', 'rye', 'spelt', 'malt', 'gluten', 'blé', 'ble', 'weizen', 'weizenmehl', 'farro', 'seitan'],
  soy: ['soy', 'soya', 'soja', 'soia', 'soybean', 'edamame', 'tofu', 'tempeh', 'sojalecithin'],
  nuts: [
    // Generic terms first — a label often says only "nuts" or "fruits à coque".
    'nut', 'nuts', 'tree nut', 'tree nuts', 'fruits à coque', 'fruits a coque',
    'schalenfrüchte', 'schalenfruchte', 'nuss', 'nüsse', 'nusse',
    'almond', 'amande', 'mandel', 'hazelnut', 'noisette', 'walnut', 'noix',
    'pecan', 'cashew', 'pistachio', 'macadamia', 'brazil nut',
  ],
  peanuts: ['peanut', 'peanuts', 'groundnut', 'arachide', 'arachides', 'erdnuss'],
  sesame: ['sesame', 'sésame', 'tahini', 'sesam'],
  mustard: ['mustard', 'moutarde', 'senf'],
  celery: ['celery', 'celeri', 'céleri', 'sellerie'],
  lupin: ['lupin', 'lupine'],
  sulphites: [
    'sulphite', 'sulphites', 'sulfite', 'sulfites', 'sulphur dioxide', 'sulfur dioxide',
    'e220', 'e221', 'e222', 'e223', 'e224', 'e226', 'e227', 'e228',
  ],
  corn: ['corn', 'maize', 'cornstarch', 'corn starch', 'high-fructose', 'high fructose', 'maïs', 'mais'],
  nightshades: ['tomato', 'tomatoes', 'potato', 'potatoes', 'pepper', 'peppers', 'eggplant', 'aubergine', 'paprika', 'tomate', 'kartoffel'],
  coconut: ['coconut', 'coco', 'kokos', 'noix de coco'],
}

/**
 * Phrases that mark the start of a precautionary cross-contamination warning.
 * Anything after one of these is "may contain" territory, not an ingredient.
 * Multilingual for the same reason the keywords are: labels are local.
 */
export const PRECAUTIONARY_MARKERS = [
  'may contain',
  'may also contain',
  'traces of',
  'trace amounts',
  'may contain traces',
  'produced in a factory',
  'made on equipment',
  'same equipment',
  'packed in a facility',
  'peut contenir',
  'peut contenir des traces',
  'traces éventuelles',
  'traces eventuelles',
  'fabriqué dans un atelier',
  'kann spuren',
  'spuren von',
  'kann spuren von',
  'hergestellt in einem betrieb',
  'può contenere',
  'puo contenere',
  'puede contener',
  'kan sporen',
  'kan bevatten',
]

/**
 * "gluten-free" contains "gluten". Without this, a free-from claim reads as a
 * hit — the exact opposite of the truth, on the label of a product bought
 * specifically to avoid that allergen.
 */
const NEGATION_AFTER = /^[\s-]*(free|frei)\b/i
const NEGATION_BEFORE = /(free from|free of|no|without|sans|ohne|zonder|senza|sin)\s+[\w\s]{0,12}$/i

export type AllergenMatchKind = 'contains' | 'may_contain'
export interface AllergenMatch {
  allergen: string
  kind: AllergenMatchKind
}

/** True if the text contains a precautionary cross-contamination phrase. */
export function hasPrecautionaryMarker(text: string): boolean {
  const lower = text.toLowerCase()
  return PRECAUTIONARY_MARKERS.some((m) => lower.includes(m))
}

/** Index where the precautionary tail begins, or -1 if there isn't one. */
function precautionaryStart(lower: string): number {
  let earliest = -1
  for (const marker of PRECAUTIONARY_MARKERS) {
    const i = lower.indexOf(marker)
    if (i !== -1 && (earliest === -1 || i < earliest)) earliest = i
  }
  return earliest
}

/**
 * Whole-word occurrences only. Plain substring matching flagged "coconut" on any
 * chocolate label (`coco` inside `cocoa`) and would flag nuts on the word
 * "nutrition". Boundaries are checked by inspecting the neighbouring character
 * rather than with regex lookbehind, which Hermes doesn't reliably support —
 * this file runs inside the mobile app too.
 */
const LETTERISH = /[a-z0-9À-ɏ]/i

function isBoundary(ch: string | undefined): boolean {
  return ch === undefined || !LETTERISH.test(ch)
}

function occurrences(haystack: string, needle: string): number[] {
  const out: number[] = []
  let i = haystack.indexOf(needle)
  while (i !== -1) {
    const before = i === 0 ? undefined : haystack[i - 1]
    const after = haystack[i + needle.length]
    if (isBoundary(before) && isBoundary(after)) out.push(i)
    i = haystack.indexOf(needle, i + 1)
  }
  return out
}

/**
 * Which of the user's allergens appear in this text, and whether each is an
 * actual ingredient or only a precautionary warning. Unknown (user-typed)
 * allergens fall back to a literal substring match on their own wording.
 *
 * Still a keyword pass, not label parsing: it reads the text it's given and
 * nothing more. But it now gets two things right that matter to someone
 * standing in a shop — a "free from" claim is not a hit, and "may contain" is
 * reported as the user's own judgement call rather than a flat contains.
 */
export function findAllergenMatches(text: string, allergens: string[]): AllergenMatch[] {
  if (!text || !allergens?.length) return []
  const lower = text.toLowerCase()
  const cut = precautionaryStart(lower)
  const out: AllergenMatch[] = []

  for (const raw of allergens) {
    const a = raw.trim().toLowerCase()
    if (!a) continue
    const needles = ALLERGEN_KEYWORDS[a] ?? [a]

    let contains = false
    let mayContain = false
    for (const kw of needles) {
      for (const at of occurrences(lower, kw)) {
        const after = lower.slice(at + kw.length, at + kw.length + 8)
        const before = lower.slice(Math.max(0, at - 24), at)
        if (NEGATION_AFTER.test(after) || NEGATION_BEFORE.test(before)) continue
        if (cut !== -1 && at >= cut) mayContain = true
        else contains = true
      }
      if (contains) break
    }

    // An ingredient beats a warning: if soy is in the list AND in the "may
    // contain" line, the honest answer is that it's in there.
    if (contains) out.push({ allergen: a, kind: 'contains' })
    else if (mayContain) out.push({ allergen: a, kind: 'may_contain' })
  }
  return out
}

/**
 * Names only, ignoring the contains / may-contain split. Kept because clients
 * that haven't updated yet read a plain string array.
 */
export function findAllergenHits(text: string, allergens: string[]): string[] {
  return findAllergenMatches(text, allergens).map((m) => m.allergen)
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
