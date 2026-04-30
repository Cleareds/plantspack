// Find country-name duplicates / native-language variants in the DB.
// Each pair of names producing different /vegan-places/<country> URLs is a
// problem: split traffic, broken internal links, broken backlinks.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Known native ↔ English aliases worth checking for. Inspired by the
// "Other" continent residue plus user-flagged Italia/Italy.
const ALIASES: Array<[string, string]> = [
  ['Italia', 'Italy'],
  ['Czechia', 'Czech Republic'],
  ['Deutschland', 'Germany'],
  ['España', 'Spain'],
  ['Espana', 'Spain'],
  ['Frankreich', 'France'],
  ['Polska', 'Poland'],
  ['Magyarország', 'Hungary'],
  ['Suomi', 'Finland'],
  ['Sverige', 'Sweden'],
  ['Nederland', 'Netherlands'],
  ['Holland', 'Netherlands'],
  ['Belgique', 'Belgium'],
  ['België', 'Belgium'],
  ['Schweiz', 'Switzerland'],
  ['Suisse', 'Switzerland'],
  ['Österreich', 'Austria'],
  ['Ellada', 'Greece'],
  ['Hellas', 'Greece'],
  ['Türkiye', 'Turkey'],
  ['Turkiye', 'Turkey'],
  ['Россия', 'Russia'],
  ['UK', 'United Kingdom'],
  ['Britain', 'United Kingdom'],
  ['Great Britain', 'United Kingdom'],
  ['United States of America', 'United States'],
  ['USA', 'United States'],
  ['Brasil', 'Brazil'],
  ['Méjico', 'Mexico'],
  ['México', 'Mexico'],
  ['North Korea', 'Korea'],
  ['South Korea', 'Korea'],
  ['South Korea (Republic of Korea)', 'South Korea'],
  ['Czech', 'Czech Republic'],
  ['Republic of Ireland', 'Ireland'],
  ['Eire', 'Ireland'],
  ['Norge', 'Norway'],
  ['Danmark', 'Denmark'],
  ['Ivory Coast', "Côte d'Ivoire"],
  ['Cabo Verde', 'Cape Verde'],
  ['East Timor', 'Timor-Leste'],
  ['Burma', 'Myanmar'],
  ['Holland', 'Netherlands'],
]

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // Pull all distinct (country, place_count) we have
  const { data, error } = await sb.from('directory_countries')
    .select('country, place_count')
    .order('place_count', { ascending: false })
  if (error) throw error

  const byName = new Map<string, number>()
  for (const r of data || []) byName.set(r.country, r.place_count)

  console.log('=== Pairs of country names that BOTH exist in DB ===')
  let conflicts = 0
  for (const [a, b] of ALIASES) {
    if (byName.has(a) && byName.has(b)) {
      conflicts++
      console.log(`  ${a} (${byName.get(a)}) <-> ${b} (${byName.get(b)})`)
    }
  }
  console.log(`\n${conflicts} conflicting pairs.`)

  console.log('\n=== Total countries with place_count > 0 ===', byName.size)
  console.log('\n=== Suspicious entries (non-English chars or odd cases): ===')
  for (const [name, count] of byName) {
    // Heuristic: contains diacritics or appears to be a city
    if (/[^ -~]/.test(name) || /[a-z][A-Z]/.test(name)) {
      console.log(`  ${count.toString().padStart(5)}  ${name}`)
    }
  }
}
main().catch(e => { console.error(e); process.exit(1) })
