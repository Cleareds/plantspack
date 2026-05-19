// Shared city-name normalization used by every place-insert path.
// Stops dirty values like "Santiago, Chile" or "Sintra (Santa Maria...)" from
// reaching the DB and breaking the city-page route, where the slug derives
// from this value.

const STATE_CODES = new Set([
  'NM','FL','DC','CA','NY','TX','IL','WA','OR','MA','PA','GA','OH','MI','NC','VA','CO','AZ','NJ','MD','MN','WI','TN','MO','IN','LA','SC','AL','KY','OK','UT','IA','NV','AR','MS','KS','NE','ID','HI','NH','ME','MT','RI','DE','SD','ND','AK','VT','WV','WY',
  'HP','MH','KA','UP','MP','GJ','RJ','PB','HR','BR','OD','AS','JK','UK','CG','TR','PY','DL','LD','AN','CH','DD',
])
const COMPASS = new Set(['North','South','East','West','N','S','E','W'])
const REGIONS_NOT_CITIES = new Set([
  'jalisco','mallorca','satakunta','bali','java','sumatra','lombok','sicily','sardinia','tuscany','andalusia','catalonia',
  'kuta','badung','badung regency','jawa timur','kabupaten gianyar','liang ndara',
])

// Lowercase prepositions / articles that stay lowercase when they appear
// mid-word in hyphenated multi-word city names.
// "Louvain-la-Neuve", "Saint-Josse-ten-Noode", "Castel di Sangro",
// "Aix-en-Provence", "Sant'Angelo", etc.
const LOWERCASE_PARTICLES = new Set([
  'la','le','les','du','de','des','d','en','el',
  'von','der','den','dem','aan','op','in','ten','te',
  'van','y','e','i','of','the','and','sur','sous',
])

// City name aliases — map the native form to the canonical English form we
// use across the platform. Keeps a single city page per metro, avoids two
// /city/munchen and /city/munich slugs splitting the rankings, and prevents
// GSC "Duplicate, Google chose a different canonical" hits on chain branches
// that ended up with different city values. Update this list together with
// scripts/_detect-accent-splits.mjs / _merge-city-accent-splits.mjs.
const CITY_ALIASES: Record<string, string> = {
  // Germany
  'munchen': 'Munich', 'münchen': 'Munich',
  'koln': 'Cologne', 'köln': 'Cologne',
  'nurnberg': 'Nuremberg', 'nürnberg': 'Nuremberg',
  'hannover': 'Hannover',  // canonical already; keep so we don't down-case
  // Austria
  'wien': 'Vienna',
  // Italy
  'roma': 'Rome', 'milano': 'Milan', 'firenze': 'Florence',
  'venezia': 'Venice', 'torino': 'Turin', 'napoli': 'Naples',
  'genova': 'Genoa', 'padova': 'Padua', 'siracusa': 'Syracuse',
  'mantova': 'Mantua',
  // Spain
  'sevilla': 'Seville',
  // Portugal — none common
  // Czechia
  'praha': 'Prague',
  // Poland
  'warszawa': 'Warsaw', 'krakow': 'Krakow', 'kraków': 'Krakow',
  // Russia / Ukraine — keep transliterated forms but normalise diacritics
  // Belgium — bilingual; pick conventional English
  'antwerpen': 'Antwerp', 'bruxelles': 'Brussels', 'brussel': 'Brussels',
  'gent': 'Ghent',
  // Netherlands
  'den haag': 'The Hague', "'s-gravenhage": 'The Hague',
  // Denmark
  'kobenhavn': 'Copenhagen', 'københavn': 'Copenhagen',
  // Sweden
  'goteborg': 'Gothenburg', 'göteborg': 'Gothenburg',
  // Finland
  'helsingfors': 'Helsinki',
  // Estonia
  'tallinn': 'Tallinn',
  // Greece — Latin-script forms only; native script handled elsewhere
  'athina': 'Athens', 'thessaloniki': 'Thessaloniki',
  // Turkey
  'istanbul': 'Istanbul',
  // Norway
  'oslo': 'Oslo',
}

/**
 * Capitalise the first letter of each space- or hyphen-separated word,
 * except for known lowercase particles (la, de, van, etc.) when they
 * appear mid-word.
 *
 * Bug history: previously used `s.replace(/\b\w/g, c => c.toUpperCase())`,
 * which broke on accented characters because `\w` is ASCII-only without
 * the `/u` flag - the word boundary fired after `è`, so "Liège" became
 * "LièGe" and "Louvain-la-Neuve" became "Louvain-La-Neuve". This
 * implementation handles those correctly.
 */
function titleCase(s: string): string {
  return s.split(' ').map(spaceWord => {
    if (!spaceWord) return spaceWord
    return spaceWord.split('-').map((part, idx) => {
      if (!part) return part
      const lower = part.toLowerCase()
      if (idx > 0 && LOWERCASE_PARTICLES.has(lower)) return lower
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    }).join('-')
  }).join(' ')
}

/**
 * Normalize a free-form city string into a single clean city name.
 * Strips parentheticals, country/state suffixes, postal codes, and
 * collapses "Neighbourhood, City" or "City, Country" patterns.
 *
 * Returns null if the input cannot be salvaged into something usable.
 */
export function normalizeCity(rawCity: string | null | undefined, country: string | null | undefined): string | null {
  if (!rawCity) return null
  const stripped = rawCity.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
  if (!stripped) return null

  if (!stripped.includes(',')) return titleCase(stripped)

  const pieces = stripped.split(',').map(p => p.trim()).filter(Boolean)
  if (pieces.length === 0) return null

  const c = (country || '').toLowerCase()
  const filtered = pieces.filter(p => {
    if (p.toLowerCase() === c) return false
    if (/^rep\.?\s+dominicana$/i.test(p) && /dominican/i.test(country || '')) return false
    if (STATE_CODES.has(p)) return false
    if (/^\d+$/.test(p)) return false
    if (/^[A-Z]{2}\s+\d+$/.test(p)) return false
    if (COMPASS.has(p)) return false
    return true
  })

  let chosen: string
  if (filtered.length === 0) chosen = pieces[0]
  else if (filtered.length === 1) chosen = filtered[0]
  else {
    const last = filtered[filtered.length - 1].toLowerCase()
    chosen = REGIONS_NOT_CITIES.has(last) ? filtered[0] : filtered[filtered.length - 1]
  }
  return applyAlias(titleCase(chosen))
}

/**
 * Map native city forms (München, Wien, Roma, Köln, Antwerpen, ...) to the
 * canonical English form. Case-insensitive and diacritic-aware on the lookup
 * key, but returns the proper-cased canonical value. No-op for cities not
 * in CITY_ALIASES.
 */
export function applyAlias(name: string): string {
  if (!name) return name
  const key = name.toLowerCase()
  if (CITY_ALIASES[key]) return CITY_ALIASES[key]
  // Try a diacritic-stripped lookup for cases like "München" -> "munchen"
  const stripped = key.normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (CITY_ALIASES[stripped]) return CITY_ALIASES[stripped]
  return name
}

/**
 * Throws if the city value would persist as dirty (contains a comma or parentheses).
 * Use this as a hard guard immediately before .insert/.update on the places table.
 */
export function assertCleanCity(city: string | null | undefined, context: string = ''): void {
  if (!city) return
  if (city.includes(',') || city.includes('(') || city.includes(')')) {
    throw new Error(
      `[normalizeCity] Refusing to write dirty city value "${city}"${context ? ` (${context})` : ''}. ` +
      `Run normalizeCity() before insert/update.`
    )
  }
}
