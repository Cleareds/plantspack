/**
 * Cosmetic ingredient vegan reference.
 *
 * Used by the /tools/barcode "Cosmetics" mode to scan an
 * Open Beauty Facts ingredient list for animal-derived components.
 *
 * Cosmetics use INCI nomenclature (International Nomenclature of
 * Cosmetic Ingredients) which differs from food labelling. The same
 * ingredient often appears under multiple names — we match on all
 * known aliases.
 *
 * Status:
 *  - 'non_vegan' : always or near-always animal-derived
 *  - 'maybe'     : can be plant or animal; the INCI name doesn't disclose source
 *  - (no 'vegan' entries here — those are the default; we only flag the rest)
 */

export type CosmeticStatus = 'non_vegan' | 'maybe'

export interface CosmeticIngredient {
  /** Canonical display name */
  name: string
  /** All INCI / common-name variants we match against (lowercased, trimmed) */
  aliases: string[]
  status: CosmeticStatus
  /** One-line note explaining source */
  note: string
}

export const COSMETIC_INGREDIENTS: CosmeticIngredient[] = [
  // ---------- Always animal-derived ----------
  {
    name: 'Carmine',
    aliases: ['carmine', 'cochineal', 'carminic acid', 'natural red 4', 'ci 75470', 'e120'],
    status: 'non_vegan',
    note: 'Red dye from crushed cochineal insects. Common in lipsticks, blushes, eyeshadows.',
  },
  {
    name: 'Lanolin',
    aliases: ['lanolin', 'lanolin alcohol', 'lanolin acid', 'lanolin wax', 'adeps lanae', 'wool fat', 'wool wax'],
    status: 'non_vegan',
    note: 'Oil secreted by sheep skin, extracted from wool. Common in lip balms, moisturisers.',
  },
  {
    name: 'Beeswax',
    aliases: ['beeswax', 'cera alba', 'cera flava', 'beeswax acid'],
    status: 'non_vegan',
    note: 'Wax produced by honey bees. Common in lip products, mascara, balms.',
  },
  {
    name: 'Honey',
    aliases: ['honey', 'mel', 'mel extract'],
    status: 'non_vegan',
    note: 'Bee-produced. Used as humectant and fragrance.',
  },
  {
    name: 'Royal jelly',
    aliases: ['royal jelly'],
    status: 'non_vegan',
    note: 'Bee secretion used in anti-ageing creams.',
  },
  {
    name: 'Propolis',
    aliases: ['propolis', 'propolis extract', 'propolis cera'],
    status: 'non_vegan',
    note: 'Resin collected by bees. In lip balms, acne treatments.',
  },
  {
    name: 'Tallow',
    aliases: ['tallow', 'sodium tallowate', 'tallowate', 'tallow acid', 'tallow glycerides'],
    status: 'non_vegan',
    note: 'Rendered beef or sheep fat. Common in soap bars.',
  },
  {
    name: 'Keratin',
    aliases: ['keratin', 'hydrolyzed keratin', 'keratin amino acids'],
    status: 'non_vegan',
    note: 'Protein from animal hair, feathers, hooves, or horns. In hair treatments.',
  },
  {
    name: 'Collagen',
    aliases: ['collagen', 'hydrolyzed collagen', 'collagen amino acids', 'soluble collagen'],
    status: 'non_vegan',
    note: 'From animal skin, bone, or cartilage. In anti-ageing products.',
  },
  {
    name: 'Elastin',
    aliases: ['elastin', 'hydrolyzed elastin'],
    status: 'non_vegan',
    note: 'Animal-derived protein, usually from cattle.',
  },
  {
    name: 'Gelatin',
    aliases: ['gelatin', 'gelatine'],
    status: 'non_vegan',
    note: 'Boiled animal bones and skin. In nail strengtheners, some shampoos.',
  },
  {
    name: 'Silk',
    aliases: ['silk', 'sericin', 'silk powder', 'hydrolyzed silk', 'silk amino acids', 'silk protein'],
    status: 'non_vegan',
    note: 'Made by silkworms, killed in extraction. In hair and skin products.',
  },
  {
    name: 'Shellac',
    aliases: ['shellac', 'shellac wax'],
    status: 'non_vegan',
    note: 'Resin from lac insects. In nail polish, hair sprays.',
  },
  {
    name: 'Casein',
    aliases: ['casein', 'sodium caseinate', 'caseinate'],
    status: 'non_vegan',
    note: 'Cow\'s milk protein. In hair conditioners, some face masks.',
  },
  {
    name: 'Milk derivatives',
    aliases: ['milk', 'lactose', 'whey', 'whey protein', 'lactoferrin', 'milk protein', 'lait'],
    status: 'non_vegan',
    note: 'Cow\'s milk-derived. In baths, lotions.',
  },
  {
    name: 'Snail secretion',
    aliases: ['snail secretion filtrate', 'snail mucin', 'snail extract', 'snail filtrate'],
    status: 'non_vegan',
    note: 'Mucus from live snails. Common in K-beauty serums.',
  },
  {
    name: 'Caviar extract',
    aliases: ['caviar extract', 'caviar'],
    status: 'non_vegan',
    note: 'Fish eggs. Anti-ageing creams.',
  },
  {
    name: 'Placenta',
    aliases: ['placenta', 'placental protein', 'placental extract'],
    status: 'non_vegan',
    note: 'Animal placenta (usually sheep). Hair treatments, anti-ageing.',
  },
  {
    name: 'Cholesterol',
    aliases: ['cholesterol'],
    status: 'non_vegan',
    note: 'Animal-derived (lanolin or brain). Skin barrier creams.',
  },
  {
    name: 'Ambergris',
    aliases: ['ambergris'],
    status: 'non_vegan',
    note: 'Whale intestinal secretion. Luxury perfumes.',
  },
  {
    name: 'Civet',
    aliases: ['civet', 'civet musk'],
    status: 'non_vegan',
    note: 'Glandular secretion from civet cats. Perfumes.',
  },
  {
    name: 'Castoreum',
    aliases: ['castoreum'],
    status: 'non_vegan',
    note: 'Beaver gland secretion. Perfumes, fragrance.',
  },
  {
    name: 'Musk',
    aliases: ['musk', 'natural musk', 'deer musk'],
    status: 'non_vegan',
    note: 'Glandular secretion from male musk deer. Perfumes. (Note: "white musk" / "musk fragrance" is usually synthetic.)',
  },
  {
    name: 'Mink oil',
    aliases: ['mink oil', 'mustela oil'],
    status: 'non_vegan',
    note: 'Fat from mink (killed for fur). Hair conditioners.',
  },
  {
    name: 'Egg',
    aliases: ['egg', 'albumen', 'ovum', 'egg yolk', 'egg white', 'ovo'],
    status: 'non_vegan',
    note: 'Chicken egg. In hair masks, conditioners.',
  },
  {
    name: 'Pearl',
    aliases: ['pearl powder', 'pearl extract', 'hydrolyzed pearl', 'conchiolin'],
    status: 'non_vegan',
    note: 'Crushed oyster pearl. Whitening creams.',
  },
  {
    name: 'Chitin / chitosan',
    aliases: ['chitin', 'chitosan'],
    status: 'non_vegan',
    note: 'From crab, lobster, or shrimp shells.',
  },
  {
    name: 'Spermaceti',
    aliases: ['spermaceti', 'cetaceum'],
    status: 'non_vegan',
    note: 'Wax from sperm whale head cavities. Historic; banned in most markets now.',
  },

  // ---------- Ambiguous (could be plant or animal) ----------
  {
    name: 'Stearic acid',
    aliases: ['stearic acid', 'stearate'],
    status: 'maybe',
    note: 'Can be plant (palm, coconut) or animal (tallow). Modern cosmetics often plant but not guaranteed.',
  },
  {
    name: 'Glycerin',
    aliases: ['glycerin', 'glycerine', 'glycerol'],
    status: 'maybe',
    note: 'Can be plant or animal-fat derived. Most modern cosmetics-grade is plant.',
  },
  {
    name: 'Squalene',
    aliases: ['squalene'],
    status: 'maybe',
    note: 'Traditionally from shark liver. Plant alternatives (olive) increasingly common. Squalane (the hydrogenated form) is more often plant-sourced now.',
  },
  {
    name: 'Squalane',
    aliases: ['squalane'],
    status: 'maybe',
    note: 'Most modern squalane is from olive or sugarcane. Some still shark-derived. Look for "plant squalane" or "olive squalane" to be sure.',
  },
  {
    name: 'Guanine',
    aliases: ['guanine', 'ci 75170'],
    status: 'maybe',
    note: 'Pearlescent pigment historically from fish scales. Synthetic versions now common.',
  },
  {
    name: 'Hyaluronic acid',
    aliases: ['hyaluronic acid', 'sodium hyaluronate'],
    status: 'maybe',
    note: 'Historically from rooster combs. Modern cosmetic-grade is almost always bacterial fermentation (vegan), but the INCI label doesn\'t disclose.',
  },
  {
    name: 'Allantoin',
    aliases: ['allantoin'],
    status: 'maybe',
    note: 'Originally cow urine. Modern allantoin is almost always synthetic from uric acid.',
  },
  {
    name: 'Cetyl alcohol',
    aliases: ['cetyl alcohol', 'cetearyl alcohol'],
    status: 'maybe',
    note: 'Historically from whale spermaceti. Modern versions are almost always plant (coconut, palm) or synthetic.',
  },
  {
    name: 'Oleic acid',
    aliases: ['oleic acid'],
    status: 'maybe',
    note: 'Can be from animal fat or plant oils.',
  },
  {
    name: 'Palmitic acid',
    aliases: ['palmitic acid'],
    status: 'maybe',
    note: 'Can be plant (palm) or animal-derived.',
  },
  {
    name: 'Lactic acid',
    aliases: ['lactic acid'],
    status: 'maybe',
    note: 'Usually plant-fermented for cosmetic use, but can be milk-derived. The INCI label doesn\'t say.',
  },
]

interface MatchedIngredient {
  name: string
  status: CosmeticStatus
  note: string
  /** The alias text that triggered the match (lowercased) */
  matchedTerm: string
}

const INDEX: Array<{ alias: string; ref: CosmeticIngredient }> =
  COSMETIC_INGREDIENTS.flatMap((c) =>
    c.aliases.map((alias) => ({ alias: alias.toLowerCase(), ref: c })),
  )
    // Match longer aliases first so "hydrolyzed silk" beats "silk"
    .sort((a, b) => b.alias.length - a.alias.length)

/**
 * Scan a cosmetic ingredient list (INCI text, comma-separated typically)
 * for animal-derived or ambiguous components.
 *
 * Match is substring-based on word boundaries to avoid false positives
 * (e.g. "Silk" should not match "Silybum marianum").
 */
export function findCosmeticHits(text: string): MatchedIngredient[] {
  if (!text) return []
  const lower = text.toLowerCase()
  const seen = new Set<string>()
  const hits: MatchedIngredient[] = []
  for (const { alias, ref } of INDEX) {
    if (seen.has(ref.name)) continue
    // Word-boundary regex around the alias, escaping regex metachars
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i')
    if (re.test(lower)) {
      seen.add(ref.name)
      hits.push({
        name: ref.name,
        status: ref.status,
        note: ref.note,
        matchedTerm: alias,
      })
    }
  }
  return hits
}

export type { MatchedIngredient }
