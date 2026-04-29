import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Common native ↔ English city pairs to look for. We canonicalise to the
// English form (what most users search for and what we already use in URLs).
const PAIRS: Array<[string, string, string]> = [
  // [native, english, country]
  ['Köln', 'Cologne', 'Germany'],
  ['München', 'Munich', 'Germany'],
  ['Wien', 'Vienna', 'Austria'],
  ['Praha', 'Prague', 'Czech Republic'],
  ['Praha', 'Prague', 'Czechia'],
  ['Warszawa', 'Warsaw', 'Poland'],
  ['Kraków', 'Krakow', 'Poland'],
  ['Krakow', 'Kraków', 'Poland'],
  ['Lisboa', 'Lisbon', 'Portugal'],
  ['Roma', 'Rome', 'Italy'],
  ['Milano', 'Milan', 'Italy'],
  ['Firenze', 'Florence', 'Italy'],
  ['Napoli', 'Naples', 'Italy'],
  ['Venezia', 'Venice', 'Italy'],
  ['Torino', 'Turin', 'Italy'],
  ['Genova', 'Genoa', 'Italy'],
  ['Sevilla', 'Seville', 'Spain'],
  ['Zaragoza', 'Saragossa', 'Spain'],
  ['Bruxelles', 'Brussels', 'Belgium'],
  ['Brussel', 'Brussels', 'Belgium'],
  ['Antwerpen', 'Antwerp', 'Belgium'],
  ['Gent', 'Ghent', 'Belgium'],
  ['Liège', 'Liege', 'Belgium'],
  ['Luik', 'Liege', 'Belgium'],
  ['København', 'Copenhagen', 'Denmark'],
  ['Göteborg', 'Gothenburg', 'Sweden'],
  ['Helsinki', 'Helsingfors', 'Finland'],
  ['Bucureşti', 'Bucharest', 'Romania'],
  ['București', 'Bucharest', 'Romania'],
  ['Athína', 'Athens', 'Greece'],
  ['Athens', 'Athína', 'Greece'],
  ['Beograd', 'Belgrade', 'Serbia'],
  ['Sofiya', 'Sofia', 'Bulgaria'],
  ['Zagreb', 'Zágráb', 'Croatia'],
  ['Moskva', 'Moscow', 'Russia'],
  // Asia
  ['Tōkyō', 'Tokyo', 'Japan'],
  ['Kyōto', 'Kyoto', 'Japan'],
  ['Ōsaka', 'Osaka', 'Japan'],
  // Switzerland
  ['Zürich', 'Zurich', 'Switzerland'],
  ['Genève', 'Geneva', 'Switzerland'],
  ['Bâle', 'Basel', 'Switzerland'],
  // Spain
  ['A Coruña', 'La Coruña', 'Spain'],
  ['Donostia', 'San Sebastián', 'Spain'],
  // Netherlands
  ['Den Haag', 'The Hague', 'Netherlands'],
  ['s-Gravenhage', 'The Hague', 'Netherlands'],
  // France
  ['Marseille', 'Marseilles', 'France'],
  // Hungary
  ['Budapest', 'Budapeszt', 'Hungary'],
]

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // Pull every (city, country) pair with counts
  const { data, error } = await sb.rpc('exec_sql' as any, {}).single()
  // Fallback: just fetch all places city/country
  const all: Map<string, number> = new Map()
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await sb.from('places')
      .select('city, country')
      .is('archived_at', null)
      .not('city', 'is', null)
      .not('country', 'is', null)
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const r of data) {
      const k = `${r.city}|||${r.country}`
      all.set(k, (all.get(k) || 0) + 1)
    }
    if (data.length < pageSize) break
    from += pageSize
  }
  console.log('total (city, country) pairs:', all.size)

  // For each known pair, report counts
  console.log('\n=== Known native ↔ English pairs ===')
  let conflicts = 0
  for (const [a, b, country] of PAIRS) {
    const ka = `${a}|||${country}`
    const kb = `${b}|||${country}`
    const na = all.get(ka) || 0
    const nb = all.get(kb) || 0
    if (na && nb) {
      conflicts++
      console.log(`  ${country}: ${a} (${na})  vs  ${b} (${nb})`)
    } else if (na || nb) {
      // single-form, could potentially canonicalise but no merge needed
      // console.log(`  ${country}: ${a} (${na})  ${b} (${nb})  (no conflict)`)
    }
  }
  console.log(`\nfound ${conflicts} conflicting pairs`)

  // Generic check: any cities in the same country that differ only by diacritics
  console.log('\n=== Diacritic-only duplicates (same country) ===')
  const byCountry = new Map<string, Map<string, string[]>>()
  for (const k of all.keys()) {
    const [city, country] = k.split('|||')
    const ascii = city.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    if (!byCountry.has(country)) byCountry.set(country, new Map())
    const m = byCountry.get(country)!
    if (!m.has(ascii)) m.set(ascii, [])
    m.get(ascii)!.push(city)
  }
  let diacriticDupes = 0
  for (const [country, m] of byCountry) {
    for (const [ascii, cities] of m) {
      const uniq = [...new Set(cities)]
      if (uniq.length > 1) {
        diacriticDupes++
        const counts = uniq.map(c => `${c} (${all.get(`${c}|||${country}`)})`).join(', ')
        console.log(`  ${country}: ${counts}`)
      }
    }
  }
  console.log(`\nfound ${diacriticDupes} diacritic-only duplicates`)
}
main().catch(e => { console.error(e); process.exit(1) })
