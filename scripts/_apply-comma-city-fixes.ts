import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const STATE_CODES = new Set([
  'NM','FL','DC','CA','NY','TX','IL','WA','OR','MA','PA','GA','OH','MI','NC','VA','CO','AZ','NJ','MD','MN','WI','TN','MO','IN','LA','SC','AL','KY','OK','UT','IA','NV','AR','MS','KS','NE','ID','HI','NH','ME','MT','RI','DE','SD','ND','AK','VT','WV','WY',
  'HP','MH','KA','UP','MP','GJ','RJ','PB','HR','BR','OD','AS','JK','UK','CG','TR','PY','DL','LD','AN','CH','DD',
])
const COMPASS = new Set(['North','South','East','West','N','S','E','W'])
const REGIONS_NOT_CITIES = new Set([
  'jalisco','mallorca','satakunta','bali','java','sumatra','lombok','sicily','sardinia','tuscany','andalusia','catalonia',
  'kuta','badung','badung regency','jawa timur','kabupaten gianyar','liang ndara',
])

// Manual overrides where the heuristic gets it wrong.
const OVERRIDES: Record<string, string> = {
  'Gubeng, Kota Surabaya, Jawa Timur': 'Surabaya',
  'Panjer, South Denpasar Bali': 'Denpasar',
  'Chamarel VCA, West': 'Chamarel',
}

function clean(city: string, country: string): string | null {
  if (OVERRIDES[city]) return OVERRIDES[city]

  // Strip parentheticals first.
  const stripped = city.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
  if (!stripped.includes(',')) {
    return stripped !== city ? stripped : null
  }

  const pieces = stripped.split(',').map(p => p.trim()).filter(Boolean)
  if (pieces.length === 0) return null

  const filtered = pieces.filter(p => {
    if (p.toLowerCase() === country.toLowerCase()) return false
    if (/^rep\.?\s+dominicana$/i.test(p) && /dominican/i.test(country)) return false
    if (STATE_CODES.has(p)) return false
    if (/^\d+$/.test(p)) return false
    if (/^[A-Z]{2}\s+\d+$/.test(p)) return false
    if (COMPASS.has(p)) return false
    return true
  })

  if (filtered.length === 0) return pieces[0]
  if (filtered.length === 1) return filtered[0]
  const last = filtered[filtered.length - 1].toLowerCase()
  if (REGIONS_NOT_CITIES.has(last)) return filtered[0]
  return filtered[filtered.length - 1]
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await sb.from('places').select('id, city, country').ilike('city', '%,%')
  if (error) { console.error(error); process.exit(1) }

  const groups = new Map<string, { newCity: string, ids: string[] }>()
  for (const r of data || []) {
    const proposed = clean(r.city, r.country)
    if (!proposed) continue
    const titled = titleCase(proposed)
    if (titled === r.city) continue
    const key = `${r.city}|||${r.country}`
    const cur = groups.get(key)
    if (cur) cur.ids.push(r.id)
    else groups.set(key, { newCity: titled, ids: [r.id] })
  }

  console.log(`Distinct (city, country) pairs to update: ${groups.size}`)
  let totalRows = 0
  for (const [k, v] of groups) totalRows += v.ids.length
  console.log(`Total rows to update: ${totalRows}`)
  console.log('---')

  let updated = 0
  for (const [key, group] of groups) {
    const [oldCity, country] = key.split('|||')
    const { error: upErr } = await sb
      .from('places')
      .update({ city: group.newCity })
      .in('id', group.ids)
    if (upErr) {
      console.error(`FAIL  ${oldCity} -> ${group.newCity}: ${upErr.message}`)
      continue
    }
    updated += group.ids.length
    console.log(`${group.ids.length.toString().padStart(3)}  ${oldCity}  →  ${group.newCity}  |  ${country}`)
  }
  console.log('---')
  console.log(`Updated ${updated} place rows.`)
}
main()
