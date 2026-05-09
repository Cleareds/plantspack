import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  // Pull all (country, city) pairs and group by lowercase to find casing/diacritic dupes.
  const all: { country: string; city: string }[] = []
  let from = 0; const PAGE = 1000
  while (true) {
    const { data } = await sb.from('places').select('country, city').is('archived_at', null).not('city','is',null).range(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    for (const r of data) all.push({ country: r.country!, city: r.city! })
    if (data.length < PAGE) break
    from += PAGE
  }
  console.log(`Scanned ${all.length} places`)

  // Group by (country, normalized city). Normalized = lowercase + strip diacritics.
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
  const groups = new Map<string, Map<string, number>>()
  for (const r of all) {
    const k = `${r.country}|${norm(r.city)}`
    if (!groups.has(k)) groups.set(k, new Map())
    const m = groups.get(k)!
    m.set(r.city, (m.get(r.city) || 0) + 1)
  }

  console.log('\nCasing/diacritic dupes (country | variants):')
  let count = 0
  for (const [k, variants] of groups.entries()) {
    if (variants.size <= 1) continue
    const [country, normCity] = k.split('|')
    const list = [...variants.entries()].sort((a,b)=>b[1]-a[1])
    console.log(`  ${country.padEnd(18)} ${normCity.padEnd(20)} ${list.map(([c,n])=>`"${c}"=${n}`).join(', ')}`)
    count++
  }
  console.log(`\nTotal dupe groups: ${count}`)
}
main()
