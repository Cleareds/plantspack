// Query normalization for the search pipeline.
//
// Runs before the Postgres FTS RPC. Does three things:
//
// 1. Pulls "intent modifiers" out of the user's query into structured
//    filters. "100% vegan ramen tokyo" -> { q: "ramen tokyo", vl:
//    "fully_vegan" }. The user sees clearer ranking and the /search
//    page can surface facet chips that match what actually filtered.
//
// 2. Substitutes token-level synonyms (NYC -> New York, roma -> Rome,
//    bxl -> Brussels, etc.). Diacritic-insensitive so "Munchen" and
//    "München" both map to "Munich". Curated by hand for now; will be
//    expanded from search_logs once we have ~4 weeks of data.
//
// 3. Collapses whitespace and trims. Returns a clean q ready for
//    plainto_tsquery + trigram similarity.
//
// IMPORTANT: never strips so aggressively that q ends up empty. If
// applying a modifier would leave zero tokens, we leave the modifier
// in place so the FTS path still has something to match on.

export interface NormalizedQuery {
  q: string
  vl?: 'fully_vegan' | 'mostly_vegan' | 'vegan_friendly' | 'vegan_options'
  cat?: 'eat' | 'store' | 'hotel' | 'organisation' | 'event'
}

// Token-level synonyms. Lookup is on the diacritic-folded lowercase
// form, so "München", "munchen", and "Muenchen" all hit "munchen" if
// listed. Map values keep their canonical English spelling so the FTS
// search_vector (which indexes the canonical city name) ranks them
// highest.
const TOKEN_SYNONYMS: Record<string, string> = {
  // English-language city abbreviations
  nyc: 'New York',
  ldn: 'London',
  la: 'Los Angeles',
  sf: 'San Francisco',
  ny: 'New York',

  // Belgian cities (Dutch/French/abbreviations -> English)
  bxl: 'Brussels',
  brux: 'Brussels',
  bruxelles: 'Brussels',
  brussel: 'Brussels',
  gent: 'Ghent',
  gand: 'Ghent',
  antwerpen: 'Antwerp',
  anvers: 'Antwerp',
  brugge: 'Bruges',
  liege: 'Liege',
  luik: 'Liege',

  // Italian cities (native -> English)
  roma: 'Rome',
  firenze: 'Florence',
  napoli: 'Naples',
  venezia: 'Venice',
  milano: 'Milan',
  torino: 'Turin',
  bologna: 'Bologna',
  genova: 'Genoa',

  // German-speaking (native -> English, plus alt spellings)
  munchen: 'Munich',
  muenchen: 'Munich',
  koln: 'Cologne',
  koeln: 'Cologne',
  frankfurt: 'Frankfurt',
  wien: 'Vienna',
  zurich: 'Zurich',
  zuerich: 'Zurich',

  // Iberian
  lisboa: 'Lisbon',
  sevilla: 'Seville',

  // Eastern European
  praha: 'Prague',
  warszawa: 'Warsaw',
  krakow: 'Krakow',
  kyiv: 'Kyiv',
  kiev: 'Kyiv',
  moskva: 'Moscow',

  // Asian
  tokio: 'Tokyo',
  beijing: 'Beijing',
  peking: 'Beijing',

  // Country abbreviations
  usa: 'United States',
  us: 'United States',
  uk: 'United Kingdom',
  nl: 'Netherlands',
  uae: 'United Arab Emirates',
  cz: 'Czechia',

  // Cuisine / topic shorthand
  veg: 'vegan',
  ramen: 'ramen',
  sushi: 'sushi',
}

// Intent patterns: regex applied to the full (folded) query. If a
// pattern matches AND removing it leaves >= 2 non-whitespace chars,
// the matched substring is stripped from q and the corresponding
// filter is set.
const INTENT_PATTERNS: Array<{ pattern: RegExp; apply: (o: NormalizedQuery) => void }> = [
  { pattern: /\b100\s*%?\s*vegan\b/gi,      apply: (o) => { o.vl = 'fully_vegan' } },
  { pattern: /\bfully\s+vegan\b/gi,         apply: (o) => { o.vl = 'fully_vegan' } },
  { pattern: /\ball[-\s]vegan\b/gi,         apply: (o) => { o.vl = 'fully_vegan' } },
  { pattern: /\bplant[-\s]based\s+only\b/gi, apply: (o) => { o.vl = 'fully_vegan' } },
  { pattern: /\bmostly\s+vegan\b/gi,        apply: (o) => { o.vl = 'mostly_vegan' } },
  { pattern: /\bvegan[-\s]friendly\b/gi,    apply: (o) => { o.vl = 'vegan_friendly' } },
  { pattern: /\bvegan\s+options?\b/gi,      apply: (o) => { o.vl = 'vegan_options' } },

  // Category cues — only set if the word is a strong signal.
  { pattern: /\b(restaurants?|cafes?|cafe|bakery|bakeries|pizzeria|diner|eatery)\b/gi, apply: (o) => { o.cat = 'eat' } },
  { pattern: /\b(hotel|hostel|guesthouse|b&b|bnb|stay|accommodation)\b/gi,             apply: (o) => { o.cat = 'hotel' } },
  { pattern: /\b(shop|store|market|grocery|supermarket)\b/gi,                          apply: (o) => { o.cat = 'store' } },
  { pattern: /\b(sanctuary|sanctuaries|rescue)\b/gi,                                   apply: (o) => { o.cat = 'organisation' } },
]

function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function normalizeQuery(
  input: string,
  opts: { existingVl?: string | null; existingCat?: string | null } = {},
): NormalizedQuery {
  let q = (input || '').trim()
  const out: NormalizedQuery = { q }

  // 1. Intent extraction. Apply patterns in order; only strip if the
  //    result still has >= 2 non-whitespace chars (don't reduce a
  //    "100% vegan" search to nothing).
  for (const { pattern, apply } of INTENT_PATTERNS) {
    pattern.lastIndex = 0
    if (!pattern.test(q)) continue
    pattern.lastIndex = 0
    const stripped = q.replace(pattern, ' ').replace(/\s+/g, ' ').trim()
    if (stripped.length >= 2) {
      apply(out)
      q = stripped
    } else {
      // Even if we can't strip, still record the filter — the user
      // clearly intended it, and the FTS will still rank places
      // matching the residual tokens.
      apply(out)
    }
  }

  // 2. Token synonym replacement on diacritic-folded forms. Multi-word
  //    synonym values stay intact (split rejoins them).
  if (q) {
    const tokens = q.split(/\s+/)
    const out_tokens: string[] = []
    for (const t of tokens) {
      const folded = fold(t)
      if (folded in TOKEN_SYNONYMS) {
        out_tokens.push(TOKEN_SYNONYMS[folded])
      } else {
        out_tokens.push(t)
      }
    }
    q = out_tokens.join(' ').replace(/\s+/g, ' ').trim()
  }

  out.q = q

  // 3. Explicit URL filters always win over inferred ones.
  if (opts.existingVl)  out.vl  = opts.existingVl  as NormalizedQuery['vl']
  if (opts.existingCat) out.cat = opts.existingCat as NormalizedQuery['cat']

  return out
}
