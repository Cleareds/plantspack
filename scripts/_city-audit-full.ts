// Full per-city status report after the 118-row demotions.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync } from 'fs'
config({ path: '.env.local' })

const CITIES: Array<[string, string]> = [
  ['London', 'United Kingdom'],
  ['Berlin', 'Germany'],
  ['Barcelona', 'Spain'],
  ['New York', 'United States'],
  ['Los Angeles', 'United States'],
]

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  for (const [city, country] of CITIES) {
    const { data: rows } = await sb.from('places')
      .select('id, name, vegan_level, source, website, address, archived_at')
      .ilike('city', city).ilike('country', country)
      .is('archived_at', null)
    if (!rows) continue
    const fv = rows.filter(r => r.vegan_level === 'fully_vegan')
    const fvNoSite = fv.filter(r => !r.website)
    const fvSite = fv.filter(r => r.website)
    const lvl = new Map<string, number>()
    for (const r of rows) lvl.set(r.vegan_level ?? 'NULL', (lvl.get(r.vegan_level ?? 'NULL') ?? 0) + 1)
    console.log(`\n=== ${city}, ${country} ===`)
    console.log(`  Total active places: ${rows.length}`)
    for (const [k, v] of [...lvl.entries()].sort((a,b)=>b[1]-a[1])) console.log(`    ${v.toString().padStart(4)}  ${k}`)
    console.log(`  fully_vegan with website (audited via scrape): ${fvSite.length}`)
    console.log(`  fully_vegan WITHOUT website (Tier D - need WebSearch): ${fvNoSite.length}`)
    if (fvNoSite.length > 0 && fvNoSite.length <= 12) {
      console.log(`  Tier D names:`)
      for (const r of fvNoSite) console.log(`    - ${r.name}  |  src=${r.source}  |  addr=${r.address || '∅'}`)
    } else if (fvNoSite.length > 0) {
      console.log(`  Tier D first 6:`)
      for (const r of fvNoSite.slice(0, 6)) console.log(`    - ${r.name}  |  src=${r.source}  |  addr=${r.address || '∅'}`)
      console.log(`    ... and ${fvNoSite.length - 6} more`)
    }
  }

  // Also save Tier D full list for the 5 cities to a CSV for WebSearch later.
  const allTierD: any[] = []
  for (const [city, country] of CITIES) {
    const { data } = await sb.from('places')
      .select('id, name, city, country, source, address, latitude, longitude')
      .eq('vegan_level', 'fully_vegan').is('archived_at', null)
      .ilike('city', city).ilike('country', country)
      .or('website.is.null,website.eq.')
    if (data) allTierD.push(...data.map(r => ({ ...r, target_city: city })))
  }
  const out = ['target_city,id,name,city,country,source,address,latitude,longitude']
  for (const r of allTierD) {
    out.push([r.target_city, r.id, r.name, r.city, r.country, r.source, r.address, r.latitude, r.longitude].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  }
  writeFileSync('reports/city-audit-tier-d.csv', out.join('\n'))
  console.log(`\nFull Tier D list: reports/city-audit-tier-d.csv  (${allTierD.length} rows)`)
}
main()
