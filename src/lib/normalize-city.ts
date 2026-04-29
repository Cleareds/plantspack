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

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
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
  return titleCase(chosen)
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
