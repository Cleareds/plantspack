/**
 * E-code (EU food additive) reference module.
 *
 * Single source of truth for additive vegan status + allergen tagging,
 * shared by the barcode scanner, ingredient scanner, and menu scanner.
 *
 * Status values:
 *   - 'vegan'      : always plant/synthetic-derived
 *   - 'non_vegan'  : always or near-always animal-derived
 *   - 'maybe'      : can be animal-derived (varies by manufacturer); flag
 *                    as uncertain and ask the user to check the label
 *
 * Allergen tag (optional) maps to the same allergen vocabulary as
 * src/app/api/tools/barcode/route.ts ALLERGEN_KEYWORDS so downstream
 * code can colocate "this E-code is a sulphite" with the user's
 * profile-allergen list.
 *
 * Only includes E-codes a vegan or allergic consumer is realistically
 * going to encounter on a packaged food label. This is not the complete
 * 250+ E-code spec.
 */

export type ECodeStatus = 'vegan' | 'non_vegan' | 'maybe'

export interface ECode {
  /** E-code without spaces, uppercase. e.g. 'E120', 'E471' */
  code: string
  /** Common name */
  name: string
  status: ECodeStatus
  /** One-line explanation we show in the UI */
  note: string
  /** Allergen group if applicable (matches barcode/route ALLERGEN_KEYWORDS keys) */
  allergen?: 'sulphites' | 'soy' | 'gluten' | 'nuts' | 'sesame' | 'dairy' | 'egg'
}

// Ordered roughly by frequency on real packaged food labels. Coverage
// is intentionally focused on additives that (a) are very common AND
// (b) have ambiguous vegan status that a label-only reading would miss.
export const E_CODES: ECode[] = [
  // ---------- Colourings ----------
  {
    code: 'E120',
    name: 'Carmine / Cochineal',
    status: 'non_vegan',
    note: 'Red dye made from crushed cochineal insects.',
  },
  {
    code: 'E901',
    name: 'Beeswax',
    status: 'non_vegan',
    note: 'Wax produced by honey bees, used as glazing.',
  },
  {
    code: 'E904',
    name: 'Shellac',
    status: 'non_vegan',
    note: 'Resin secreted by the lac insect, used as glazing on confectionery.',
  },
  {
    code: 'E913',
    name: 'Lanolin',
    status: 'non_vegan',
    note: 'Wax from sheep wool, used in vitamin D supplements.',
  },
  {
    code: 'E152',
    name: 'Carbon black',
    status: 'maybe',
    note: 'Can be made from charred bones; modern manufacturing is usually plant.',
  },
  {
    code: 'E153',
    name: 'Vegetable carbon',
    status: 'vegan',
    note: 'Carbon black from burnt plant material.',
  },
  {
    code: 'E160a',
    name: 'Carotenes (beta-carotene)',
    status: 'vegan',
    note: 'Plant or synthetic origin in food use.',
  },

  // ---------- Acidity / preservatives ----------
  {
    code: 'E220', name: 'Sulphur dioxide', status: 'vegan',
    note: 'Plant or synthetic. Allergen for sulphite-sensitive consumers.',
    allergen: 'sulphites',
  },
  {
    code: 'E221', name: 'Sodium sulphite', status: 'vegan',
    note: 'Sulphite preservative. Allergen.',
    allergen: 'sulphites',
  },
  {
    code: 'E222', name: 'Sodium bisulphite', status: 'vegan',
    note: 'Sulphite preservative. Allergen.',
    allergen: 'sulphites',
  },
  {
    code: 'E223', name: 'Sodium metabisulphite', status: 'vegan',
    note: 'Sulphite preservative. Allergen.',
    allergen: 'sulphites',
  },
  {
    code: 'E224', name: 'Potassium metabisulphite', status: 'vegan',
    note: 'Sulphite preservative. Allergen.',
    allergen: 'sulphites',
  },
  {
    code: 'E226', name: 'Calcium sulphite', status: 'vegan',
    note: 'Sulphite preservative. Allergen.',
    allergen: 'sulphites',
  },
  {
    code: 'E227', name: 'Calcium hydrogen sulphite', status: 'vegan',
    note: 'Sulphite preservative. Allergen.',
    allergen: 'sulphites',
  },
  {
    code: 'E228', name: 'Potassium hydrogen sulphite', status: 'vegan',
    note: 'Sulphite preservative. Allergen.',
    allergen: 'sulphites',
  },
  {
    code: 'E322', name: 'Lecithin',
    status: 'maybe',
    note: 'Usually soy or sunflower, but can be from egg yolk. Look for "soy lecithin" or "sunflower lecithin" to be sure.',
    // Soy is the dominant source - flag as soy allergen if present
    allergen: 'soy',
  },

  // ---------- Emulsifiers / fatty-acid family ----------
  // E471 is the single biggest ambiguous one - appears in many breads,
  // chocolates, biscuits, margarines.
  {
    code: 'E422', name: 'Glycerol (glycerine)', status: 'maybe',
    note: 'Can be from animal fat or plant oil. Modern food-grade is usually plant.',
  },
  {
    code: 'E430', name: 'Polyoxyethylene (8) stearate', status: 'maybe',
    note: 'Stearic acid base can be animal or plant.',
  },
  {
    code: 'E431', name: 'Polyoxyethylene (40) stearate', status: 'maybe',
    note: 'Stearic acid base can be animal or plant.',
  },
  {
    code: 'E432', name: 'Polysorbate 20', status: 'maybe',
    note: 'Fatty-acid esters - can be animal-derived.',
  },
  {
    code: 'E433', name: 'Polysorbate 80', status: 'maybe',
    note: 'Fatty-acid esters - can be animal-derived.',
  },
  {
    code: 'E441', name: 'Gelatine', status: 'non_vegan',
    note: 'Collagen from animal bones and skin (pork or beef).',
  },
  {
    code: 'E470a', name: 'Sodium/potassium/calcium salts of fatty acids', status: 'maybe',
    note: 'Fatty acids can be animal or plant origin.',
  },
  {
    code: 'E470b', name: 'Magnesium salts of fatty acids', status: 'maybe',
    note: 'Fatty acids can be animal or plant origin.',
  },
  {
    code: 'E471', name: 'Mono- and diglycerides of fatty acids', status: 'maybe',
    note: 'Very common emulsifier. Source can be animal (tallow) or plant (palm/soy). Most EU manufacturers now use plant sources but it is not guaranteed.',
  },
  {
    code: 'E472a', name: 'Acetic acid esters of mono/diglycerides', status: 'maybe',
    note: 'Mono/diglyceride base can be animal or plant.',
  },
  {
    code: 'E472b', name: 'Lactic acid esters of mono/diglycerides', status: 'maybe',
    note: 'Mono/diglyceride base can be animal or plant.',
  },
  {
    code: 'E472c', name: 'Citric acid esters of mono/diglycerides', status: 'maybe',
    note: 'Mono/diglyceride base can be animal or plant.',
  },
  {
    code: 'E472d', name: 'Tartaric acid esters of mono/diglycerides', status: 'maybe',
    note: 'Mono/diglyceride base can be animal or plant.',
  },
  {
    code: 'E472e', name: 'Mono/diacetyl tartaric acid esters', status: 'maybe',
    note: 'DATEM - common in bread improver. Mono/diglyceride base can be animal or plant.',
  },
  {
    code: 'E472f', name: 'Mixed acetic/tartaric esters of mono/diglycerides', status: 'maybe',
    note: 'Mono/diglyceride base can be animal or plant.',
  },
  {
    code: 'E473', name: 'Sucrose esters of fatty acids', status: 'maybe',
    note: 'Fatty acids can be animal or plant origin.',
  },
  {
    code: 'E474', name: 'Sucroglycerides', status: 'maybe',
    note: 'Fatty acids can be animal or plant origin.',
  },
  {
    code: 'E475', name: 'Polyglycerol esters of fatty acids', status: 'maybe',
    note: 'Fatty acids can be animal or plant origin.',
  },
  {
    code: 'E476', name: 'Polyglycerol polyricinoleate (PGPR)', status: 'vegan',
    note: 'From castor bean oil. Common in chocolate.',
  },
  {
    code: 'E477', name: 'Propane-1,2-diol esters of fatty acids', status: 'maybe',
    note: 'Fatty acids can be animal or plant origin.',
  },
  {
    code: 'E479', name: 'Thermally oxidised soya bean oil', status: 'vegan',
    note: 'Soy-derived. Vegan.', allergen: 'soy',
  },
  {
    code: 'E481', name: 'Sodium stearoyl-2-lactylate (SSL)', status: 'maybe',
    note: 'Stearic acid can be animal or plant. Common in bread.',
  },
  {
    code: 'E482', name: 'Calcium stearoyl-2-lactylate (CSL)', status: 'maybe',
    note: 'Stearic acid can be animal or plant. Common in bread.',
  },
  {
    code: 'E483', name: 'Stearyl tartrate', status: 'maybe',
    note: 'Stearic acid can be animal or plant.',
  },
  {
    code: 'E491', name: 'Sorbitan monostearate', status: 'maybe',
    note: 'Stearic acid can be animal or plant.',
  },
  {
    code: 'E492', name: 'Sorbitan tristearate', status: 'maybe',
    note: 'Stearic acid can be animal or plant.',
  },
  {
    code: 'E493', name: 'Sorbitan monolaurate', status: 'maybe',
    note: 'Fatty acids can be animal or plant.',
  },
  {
    code: 'E494', name: 'Sorbitan monooleate', status: 'maybe',
    note: 'Oleic acid can be animal or plant.',
  },
  {
    code: 'E495', name: 'Sorbitan monopalmitate', status: 'maybe',
    note: 'Palmitic acid can be animal or plant.',
  },
  {
    code: 'E542', name: 'Bone phosphate', status: 'non_vegan',
    note: 'Made from animal bones (anti-caking).',
  },
  {
    code: 'E570', name: 'Stearic acid / fatty acid', status: 'maybe',
    note: 'Can be animal or plant.',
  },
  {
    code: 'E631', name: 'Disodium inosinate (sodium 5\'-inosinate)', status: 'maybe',
    note: 'Flavour enhancer. Usually from fish or meat; can be synthetic. Common in flavoured crisps and instant noodles.',
  },
  {
    code: 'E635', name: 'Disodium 5\'-ribonucleotides', status: 'maybe',
    note: 'Mix of E627 and E631; the E631 portion is usually animal-derived.',
  },
  {
    code: 'E640', name: 'Glycine and its sodium salt', status: 'maybe',
    note: 'Glycine can be animal or synthetic in food use.',
  },
  {
    code: 'E910', name: 'L-Cystine', status: 'maybe',
    note: 'Often from duck feathers or human hair; can be synthetic. Used in dough conditioners.',
  },
  {
    code: 'E920', name: 'L-Cysteine', status: 'maybe',
    note: 'Often from duck feathers, pig bristles, or human hair; can be synthetic. Common in bread/bagel improver.',
  },
  {
    code: 'E966', name: 'Lactitol', status: 'non_vegan',
    note: 'Sweetener derived from lactose (cow\'s milk). Dairy.',
    allergen: 'dairy',
  },
  {
    code: 'E1105', name: 'Lysozyme', status: 'non_vegan',
    note: 'Enzyme extracted from egg white. Common in cheese, wine.',
    allergen: 'egg',
  },
]

/** Lookup index for fast match. */
const E_CODE_BY_CODE = new Map(E_CODES.map(e => [e.code, e]))

/** Normalise a string token to a canonical E-code form. Returns null if not a code. */
function normaliseECode(raw: string): string | null {
  const m = raw.toUpperCase().match(/^E[\s-]?(\d{3,4})([A-F]?)$/)
  if (!m) return null
  return 'E' + m[1] + (m[2] || '')
}

/**
 * Scan free-form ingredient text for E-codes. Returns hits with full
 * reference data, deduplicated. Case-insensitive, tolerant of "E 471",
 * "E-471", "(E471)" forms.
 */
export function findECodeHits(text: string): ECode[] {
  if (!text) return []
  // Match E-codes with optional space/dash/parens around the digits
  const re = /\b[Ee][\s-]?(\d{3,4})([a-fA-F]?)\b/g
  const seen = new Set<string>()
  const hits: ECode[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const code = 'E' + m[1] + (m[2] ? m[2].toLowerCase() : '')
    // Try both with and without subletter (e.g. E472 vs E472a)
    const entry = E_CODE_BY_CODE.get(code) ?? E_CODE_BY_CODE.get('E' + m[1])
    if (entry && !seen.has(entry.code)) {
      seen.add(entry.code)
      hits.push(entry)
    }
  }
  return hits
}

/** Return only the non-vegan / maybe entries from a text scan. */
export function findProblematicECodes(text: string): { nonVegan: ECode[]; maybe: ECode[] } {
  const hits = findECodeHits(text)
  return {
    nonVegan: hits.filter(h => h.status === 'non_vegan'),
    maybe: hits.filter(h => h.status === 'maybe'),
  }
}

/** Return E-codes that match the user's allergen list. */
export function findAllergenECodes(text: string, allergens: string[]): ECode[] {
  if (!text || !allergens?.length) return []
  const allergenSet = new Set(allergens.map(a => a.toLowerCase()))
  return findECodeHits(text).filter(e => e.allergen && allergenSet.has(e.allergen))
}

/** Plain-English summary line for the UI when E-codes are detected. */
export function summariseECodeFindings(text: string): string | null {
  const { nonVegan, maybe } = findProblematicECodes(text)
  if (nonVegan.length === 0 && maybe.length === 0) return null
  const parts: string[] = []
  if (nonVegan.length) {
    parts.push(`Animal-derived: ${nonVegan.map(e => `${e.code} (${e.name})`).join(', ')}`)
  }
  if (maybe.length) {
    parts.push(`Could be animal-derived: ${maybe.map(e => e.code).join(', ')}`)
  }
  return parts.join('. ')
}
