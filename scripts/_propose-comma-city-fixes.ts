import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const STATE_CODES = new Set([
  'NM','FL','DC','CA','NY','TX','IL','WA','OR','MA','PA','GA','OH','MI','NC','VA','CO','AZ','NJ','MD','MN','WI','TN','MO','IN','LA','SC','AL','KY','OK','UT','IA','NV','AR','MS','KS','NE','ID','HI','NH','ME','MT','RI','DE','SD','ND','AK','VT','WV','WY',
  'HP','MH','KA','TN','UP','MP','GJ','RJ','PB','HR','BR','OD','AS','JK','UK','CG','TR','GA','PY','DL','LD','AN','CH','DD',
])
const COMPASS = new Set(['North','South','East','West','N','S','E','W'])
// Pieces that are regions/islands/states, NOT the city — when these appear last, use the first piece instead.
const REGIONS_NOT_CITIES = new Set([
  'jalisco','mallorca','satakunta','bali','java','sumatra','lombok','sicily','sardinia','tuscany','andalusia','catalonia',
  'kuta','badung','badung regency','jawa timur','kabupaten gianyar','liang ndara',
  'hp','mh','ka','up','mp','nm','fl','dc','ca','ny','tx',
])

function clean(city: string, country: string): string | null {
  let s = city.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  if (!s.includes(',')) return null

  const pieces = s.split(',').map(p => p.trim()).filter(Boolean)
  if (pieces.length === 0) return null

  const filtered = pieces.filter(p => {
    if (p.toLowerCase() === country.toLowerCase()) return false
    if (/^rep\.?\s+dominicana$/i.test(p) && /dominican/i.test(country)) return false
    if (STATE_CODES.has(p)) return false
    if (/^\d+$/.test(p)) return false                      // bare postal "84"
    if (/^[A-Z]{2}\s+\d+$/.test(p)) return false           // "FL 33138"
    if (COMPASS.has(p)) return false
    return true
  })

  if (filtered.length === 0) return pieces[0]
  if (filtered.length === 1) return filtered[0]

  // Multiple pieces left. Default: last piece is the broader city (suburb→city pattern).
  // But if last piece looks like a region/island/state, use the first.
  const last = filtered[filtered.length - 1].toLowerCase()
  if (REGIONS_NOT_CITIES.has(last)) return filtered[0]
  return filtered[filtered.length - 1]
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await sb.from('places').select('city, country').ilike('city', '%,%')
  if (error) { console.error(error); process.exit(1) }

  const map = new Map<string, { country: string, count: number }>()
  for (const r of data || []) {
    const k = `${r.city}|||${r.country}`
    const cur = map.get(k)
    if (cur) cur.count++; else map.set(k, { country: r.country, count: 1 })
  }

  const rows = [...map.entries()].map(([k, v]) => {
    const [city, _] = k.split('|||')
    const proposed = clean(city, v.country)
    const titled = proposed ? titleCase(proposed) : null
    return { city, country: v.country, count: v.count, proposed: titled }
  })
  rows.sort((a, b) => b.count - a.count)

  console.log(`count  current city  →  proposed  |  country`)
  console.log('-'.repeat(100))
  for (const r of rows) {
    const arrow = r.proposed && r.proposed !== r.city ? ` →  ${r.proposed}` : `   (no change)`
    console.log(`${r.count.toString().padStart(4)}   ${r.city}${arrow}  |  ${r.country}`)
  }
  console.log('---')
  console.log(`Total dirty rows: ${data?.length}, distinct: ${rows.length}`)
  const willChange = rows.filter(r => r.proposed && r.proposed !== r.city)
  console.log(`Rows that will change: ${willChange.reduce((a, r) => a + r.count, 0)} across ${willChange.length} distinct cities`)
}
main()
