/**
 * Static search index for tools, feature pages, and content-hub guides.
 *
 * Search 2026-07-11: /api/search and /search covered places, cities,
 * countries, and recipes only - so "scanner", "wine", or "is honey vegan"
 * returned nothing while a purpose-built page existed one URL away. This
 * module makes those surfaces findable with zero DB work: a keyword
 * registry for tools/pages, plus matchers over the /vegan content-hub
 * registries (which already declare the exact `searchQueries` each
 * article targets).
 *
 * Matching is deliberately conservative: a section only surfaces on a
 * clear signal (exact phrase or strong token hit). City/place queries
 * like "berlin" or "green bowl cafe" must score 0 here - the geographic
 * groups handle those.
 */
import { INGREDIENT_ARTICLES, TRAVEL_GUIDES } from '@/lib/vegan-content'

export interface SectionHit {
  title: string
  url: string
  description: string
  kind: 'tool' | 'page' | 'guide'
}

interface SectionEntry extends SectionHit {
  /** Lowercase phrases/tokens that identify this entry. Multi-word entries
   *  match as substrings; single words match as whole tokens. */
  keywords: string[]
}

const TOOL_SECTIONS: SectionEntry[] = [
  {
    title: 'Food barcode scanner',
    url: '/tools/barcode',
    description: 'Scan a product barcode and get a vegan verdict from Open Food Facts data.',
    kind: 'tool',
    keywords: ['scanner', 'scan', 'barcode', 'is it vegan', 'product check', 'food scanner', 'check product'],
  },
  {
    title: 'Cosmetics barcode scanner',
    url: '/tools/barcode?mode=cosmetics',
    description: 'Check cosmetics for animal-derived ingredients and cruelty-free signals.',
    kind: 'tool',
    keywords: ['cosmetics', 'makeup', 'shampoo', 'skincare', 'cruelty free', 'cruelty-free', 'beauty products'],
  },
  {
    title: 'Ingredient label scanner',
    url: '/tools/ingredient-scanner',
    description: 'Paste or photograph an ingredient list and flag non-vegan ingredients and E-numbers.',
    kind: 'tool',
    keywords: ['ingredient', 'ingredients', 'label', 'e-number', 'e number', 'enumber', 'additive', 'additives', 'ingredient checker'],
  },
  {
    title: 'Drinks lookup (beer & wine)',
    url: '/tools/drinks',
    description: 'Look up whether a beer, wine, or spirit is vegan - fining agents like isinglass are not on the label.',
    kind: 'tool',
    keywords: ['drinks', 'beer', 'wine', 'cider', 'spirits', 'alcohol', 'barnivore', 'is my beer vegan', 'is my wine vegan'],
  },
  {
    title: 'Baking substitute calculator',
    url: '/tools/baking',
    description: 'Convert any recipe: egg, butter, milk, and honey substitutions with exact quantities.',
    kind: 'tool',
    keywords: ['baking', 'bake', 'egg substitute', 'egg replacer', 'butter substitute', 'aquafaba', 'flax egg', 'veganize recipe', 'veganise'],
  },
  {
    title: 'Vegan substitute finder',
    url: '/tools/substitutes',
    description: 'Find a plant-based swap for any animal ingredient, with ratios and use cases.',
    kind: 'tool',
    keywords: ['substitute', 'substitutes', 'swap', 'replacement', 'replace', 'alternative to'],
  },
  {
    title: 'Menu scanner',
    url: '/tools/menu-scanner',
    description: 'Photograph a menu in any language and get the vegan-safe options highlighted.',
    kind: 'tool',
    keywords: ['menu', 'translate menu', 'menu translator', 'restaurant menu', 'foreign menu'],
  },
  {
    title: 'Printable restaurant cards',
    url: '/tools/cards',
    description: 'Show-the-waiter cards explaining vegan requirements in the local language.',
    kind: 'tool',
    keywords: ['cards', 'restaurant card', 'travel card', 'waiter', 'phrasebook', 'explain vegan'],
  },
  {
    title: 'Vegan impact calculator',
    url: '/tools/calculator',
    description: 'Estimate animals, CO2, water, and land spared by your time being vegan.',
    kind: 'tool',
    keywords: ['impact', 'calculator', 'co2', 'carbon', 'water saved', 'animals saved', 'footprint'],
  },
]

const PAGE_SECTIONS: SectionEntry[] = [
  {
    title: 'Map',
    url: '/map',
    description: 'Every vegan and vegan-friendly place on one map.',
    kind: 'page',
    keywords: ['map', 'near me', 'nearby', 'around me'],
  },
  {
    title: 'City Ranks',
    url: '/city-ranks',
    description: 'Cities ranked by the PlantsPack vegan city score.',
    kind: 'page',
    keywords: ['city ranks', 'ranking', 'best city', 'best cities', 'most vegan city', 'best vegan city', 'best vegan cities', 'top vegan cities', 'city score'],
  },
  {
    title: 'Events',
    url: '/events',
    description: 'Vegan festivals, markets, and meetups worldwide.',
    kind: 'page',
    keywords: ['events', 'event', 'festival', 'festivals', 'market', 'meetup', 'fair'],
  },
  {
    title: 'Recipes',
    url: '/recipes',
    description: 'Vegan recipes from 100% vegan creators.',
    kind: 'page',
    keywords: ['recipes', 'recipe', 'cook', 'cooking', 'kitchen'],
  },
  {
    title: 'Library',
    url: '/library',
    description: 'Guides and long-form reading on vegan life.',
    kind: 'page',
    keywords: ['library', 'guides', 'articles', 'read', 'learn'],
  },
  {
    title: 'Glossary',
    url: '/glossary',
    description: 'Vegan terms, ingredients, and label jargon explained.',
    kind: 'page',
    keywords: ['glossary', 'definition', 'meaning', 'what is', 'terms'],
  },
  {
    title: 'All tools',
    url: '/tools',
    description: 'Every free PlantsPack tool: scanners, lookups, calculators.',
    kind: 'page',
    keywords: ['tools', 'tool'],
  },
  {
    title: 'Travel packs',
    url: '/packs',
    description: 'Curated place collections for trips and cities.',
    kind: 'page',
    keywords: ['packs', 'pack', 'itinerary', 'trip', 'travel guide'],
  },
]

const STATIC_SECTIONS = [...TOOL_SECTIONS, ...PAGE_SECTIONS]

// Tokens too generic to identify a section on their own. "vegan" is in
// virtually every query on a vegan platform; bare stopwords never signal.
const STOPWORDS = new Set(['vegan', 'the', 'a', 'an', 'is', 'it', 'in', 'for', 'of', 'to', 'my', 'me', 'and', 'or', 'best', 'free', 'plantspack'])

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/[\s]+/).filter(t => t.length >= 2 && !STOPWORDS.has(t))
}

/** E-number pattern (e471, e 120, E-631) - always ingredient territory. */
const E_NUMBER = /\be[\s-]?\d{3}[a-z]?\b/i

function scoreEntry(qLower: string, qTokens: string[], keywords: string[], title: string): number {
  let score = 0
  for (const kw of keywords) {
    if (kw.includes(' ')) {
      // Phrase inside query, or query inside phrase ("palm oil" should hit
      // an article targeting "is palm oil vegan").
      if (qLower.includes(kw)) score += 4
      else if (qLower.length >= 5 && kw.includes(qLower)) score += 3
    } else if (qTokens.includes(kw)) {
      score += 3
    }
  }
  const titleTokens = tokenize(title)
  for (const t of qTokens) if (titleTokens.includes(t)) score += 1
  return score
}

/** Tools + feature pages matching the query. Empty for geo/venue queries. */
export function matchSections(rawQuery: string, limit = 3): SectionHit[] {
  const qLower = rawQuery.toLowerCase().trim()
  if (qLower.length < 2) return []
  const qTokens = tokenize(qLower)
  const scored: Array<{ s: SectionEntry; score: number }> = []
  for (const s of STATIC_SECTIONS) {
    let score = scoreEntry(qLower, qTokens, s.keywords, s.title)
    // E-number queries always mean the ingredient scanner.
    if (E_NUMBER.test(qLower) && s.url === '/tools/ingredient-scanner') score += 5
    if (score >= 3) scored.push({ s, score })
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ s }) => ({ title: s.title, url: s.url, description: s.description, kind: s.kind }))
}

/** Content-hub guides (ingredient articles + travel guides) matching the query. */
export function matchGuides(rawQuery: string, limit = 3): SectionHit[] {
  const qLower = rawQuery.toLowerCase().trim()
  if (qLower.length < 2) return []
  const qTokens = tokenize(qLower)
  const scored: Array<{ hit: SectionHit; score: number }> = []

  for (const a of INGREDIENT_ARTICLES) {
    // The registry documents the exact searches each article targets -
    // use those as first-class phrases, plus the slug and title tokens.
    let score = scoreEntry(qLower, qTokens, [a.slug, ...a.searchQueries.map(s => s.toLowerCase())], a.title)
    if (E_NUMBER.test(qLower) && a.slug === 'e-codes') score += 5
    if (score >= 3) {
      scored.push({
        hit: { title: a.title, url: `/vegan/${a.slug}`, description: a.verdictHeadline || a.tldr, kind: 'guide' },
        score,
      })
    }
  }
  for (const g of TRAVEL_GUIDES) {
    const name = g.countryName.toLowerCase()
    // Country name alone must NOT trigger the guide (the countries group
    // owns bare "japan"); require travel intent alongside it.
    const travelIntent = /\b(travel|trip|visit|guide|holiday|vacation)\b/.test(qLower)
    if (!travelIntent) continue
    const score = scoreEntry(qLower, qTokens, [name, `vegan in ${name}`], g.countryName)
    if (score >= 3) {
      scored.push({
        hit: {
          title: `Vegan travel guide: ${g.countryName}`,
          url: `/vegan/travel/${g.countrySlug}`,
          description: g.tldr || g.metaDescription,
          kind: 'guide',
        },
        score,
      })
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(x => x.hit)
}

/**
 * Published blog articles whose title matches the query. Takes the caller's
 * Supabase client so the API route and the SSR search page share one
 * implementation. Title-only ILIKE — content matching at this article count
 * (~dozens) adds noise, not recall.
 */
export async function searchBlogArticles(sb: any, q: string, limit = 3): Promise<SectionHit[]> {
  const needle = q.trim()
  if (needle.length < 3) return []
  try {
    const { data } = await sb
      .from('posts')
      .select('slug, title, content')
      .eq('category', 'article')
      .eq('privacy', 'public')
      .is('deleted_at', null)
      .ilike('title', `%${needle}%`)
      .limit(limit)
    return (data || []).map((p: any) => ({
      title: p.title,
      url: `/blog/${p.slug}`,
      description: typeof p.content === 'string' ? p.content.replace(/[#*_>\[\]]/g, '').slice(0, 140) : '',
      kind: 'guide' as const,
    }))
  } catch {
    return []
  }
}
