import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const revalidate = 86400

type Verdict = 'vegan' | 'not_vegan' | 'uncertain' | 'not_found'

export interface BarcodeResult {
  barcode: string
  verdict: Verdict
  reason: string
  productName: string | null
  brand: string | null
  imageUrl: string | null
  ingredients: string | null
  nonVeganHits: string[]
  allergenHits: string[]
  labels: string[]
  source: 'open-food-facts'
}

// Animal-derived ingredients we flag in the raw ingredient text when OFF
// hasn't given us a clean verdict. Lowercased substring match.
const NON_VEGAN_TERMS = [
  'milk', 'whey', 'casein', 'lactose', 'butter', 'cream', 'cheese', 'ghee',
  'egg', 'albumen', 'ovalbumin',
  'honey', 'beeswax', 'royal jelly',
  'gelatin', 'gelatine', 'collagen',
  'lard', 'tallow', 'suet', 'beef', 'pork', 'chicken', 'fish', 'anchovy',
  'shellac', 'carmine', 'cochineal', 'e120',
  'isinglass', 'cod liver',
  'l-cysteine (from feather)', 'l-cysteine',
  'lanolin',
]

function verdictFromOff(off: {
  ingredients_analysis_tags?: string[]
  labels_tags?: string[]
  ingredients_text?: string
}): { verdict: Verdict; reason: string; hits: string[] } {
  const analysis = off.ingredients_analysis_tags ?? []
  const labels = off.labels_tags ?? []

  if (labels.includes('en:vegan')) {
    return { verdict: 'vegan', reason: 'Carries a vegan label/certification.', hits: [] }
  }
  if (analysis.includes('en:non-vegan')) {
    return { verdict: 'not_vegan', reason: 'Open Food Facts marks this as non-vegan.', hits: [] }
  }
  if (analysis.includes('en:vegan')) {
    return { verdict: 'vegan', reason: 'Open Food Facts ingredient analysis: vegan.', hits: [] }
  }

  // Fall back to ingredient text scan
  const text = (off.ingredients_text ?? '').toLowerCase()
  if (text) {
    const hits = NON_VEGAN_TERMS.filter((t) => text.includes(t))
    if (hits.length > 0) {
      return {
        verdict: 'not_vegan',
        reason: `Ingredient list contains likely animal-derived items: ${hits.slice(0, 4).join(', ')}.`,
        hits,
      }
    }
    if (analysis.includes('en:maybe-vegan')) {
      return {
        verdict: 'uncertain',
        reason: 'Some ingredients have ambiguous origin (could be plant or animal). Check the label.',
        hits: [],
      }
    }
    return {
      verdict: 'uncertain',
      reason: 'No obvious animal ingredients spotted, but no clean vegan signal either. Double-check the label.',
      hits: [],
    }
  }

  return {
    verdict: 'uncertain',
    reason: 'Open Food Facts has this product but no ingredient list yet.',
    hits: [],
  }
}

// Quick keyword sets for allergen detection in ingredient text.
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  gluten: ['wheat', 'barley', 'rye', 'spelt', 'malt', 'gluten'],
  soy: ['soy', 'soja', 'soia', 'soybean', 'edamame'],
  nuts: ['almond', 'hazelnut', 'walnut', 'pecan', 'cashew', 'pistachio', 'macadamia', 'brazil nut'],
  peanuts: ['peanut', 'groundnut', 'arachide'],
  sesame: ['sesame', 'tahini'],
  mustard: ['mustard', 'moutarde'],
  celery: ['celery', 'celeri'],
  lupin: ['lupin'],
  sulphites: ['sulphite', 'sulfite', 'sulphur dioxide', 'sulfur dioxide', 'e220', 'e221', 'e222', 'e223', 'e224', 'e226', 'e227', 'e228'],
  corn: ['corn ', 'maize', 'cornstarch', 'corn starch', 'high-fructose', 'high fructose'],
  nightshades: ['tomato', 'potato', 'pepper', 'eggplant', 'aubergine', 'paprika'],
  coconut: ['coconut'],
}

function findAllergenHits(text: string, allergens: string[]): string[] {
  if (!text || allergens.length === 0) return []
  const lower = text.toLowerCase()
  const hits = new Set<string>()
  for (const a of allergens) {
    const known = ALLERGEN_KEYWORDS[a]
    if (known) {
      for (const kw of known) {
        if (lower.includes(kw)) {
          hits.add(a)
          break
        }
      }
    } else if (lower.includes(a)) {
      // Custom allergen - just look for the literal string
      hits.add(a)
    }
  }
  return Array.from(hits)
}

export async function GET(req: NextRequest) {
  const barcode = (req.nextUrl.searchParams.get('barcode') ?? '').trim()
  if (!/^\d{6,14}$/.test(barcode)) {
    return NextResponse.json({ error: 'Invalid barcode' }, { status: 400 })
  }
  const allergens = (req.nextUrl.searchParams.get('allergens') ?? '')
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter((a) => a.length > 0 && a.length < 40)

  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,ingredients_text,ingredients_analysis_tags,image_url,labels_tags`

  let off: { status: number; product?: Record<string, unknown> } | null = null
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'PlantsPack-VeganTools/1.0 (https://www.plantspack.com; hello@plantspack.com)',
        Accept: 'application/json',
      },
      signal: controller.signal,
      next: { revalidate: 86400 },
    })
    clearTimeout(timeoutId)
    // OFF returns 404 (or sometimes 200 with status:0) when a product isn't in
    // their database. That's a legitimate "not found" answer, not an outage.
    if (r.status === 404) {
      off = { status: 0 }
    } else if (!r.ok) {
      console.error(`[barcode] OFF returned ${r.status} for ${barcode}`)
      throw new Error(`OFF returned ${r.status}`)
    } else {
      off = await r.json()
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error(`[barcode] OFF fetch failed for ${barcode}:`, msg)
    return NextResponse.json(
      { error: `Open Food Facts could not be reached (${msg}). Try again in a moment.` },
      { status: 502 },
    )
  }

  if (!off || off.status !== 1 || !off.product) {
    const result: BarcodeResult = {
      barcode,
      verdict: 'not_found',
      reason: 'This barcode is not in Open Food Facts yet. You can add it at openfoodfacts.org.',
      productName: null,
      brand: null,
      imageUrl: null,
      ingredients: null,
      nonVeganHits: [],
      allergenHits: [],
      labels: [],
      source: 'open-food-facts',
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'public, s-maxage=3600' } })
  }

  const p = off.product as Record<string, unknown>
  const v = verdictFromOff({
    ingredients_analysis_tags: (p.ingredients_analysis_tags as string[]) ?? [],
    labels_tags: (p.labels_tags as string[]) ?? [],
    ingredients_text: (p.ingredients_text as string) ?? '',
  })

  const ingredientsText = (p.ingredients_text as string) || ''
  const allergenHits = findAllergenHits(ingredientsText, allergens)

  const result: BarcodeResult = {
    barcode,
    verdict: v.verdict,
    reason: v.reason,
    productName: (p.product_name as string) || null,
    brand: (p.brands as string) || null,
    imageUrl: (p.image_url as string) || null,
    ingredients: ingredientsText || null,
    nonVeganHits: v.hits,
    allergenHits,
    labels: ((p.labels_tags as string[]) ?? []).filter((l) => l.startsWith('en:')).map((l) => l.replace('en:', '')),
    source: 'open-food-facts',
  }

  return NextResponse.json(result, { headers: { 'Cache-Control': 'public, s-maxage=86400' } })
}
