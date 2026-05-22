import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const all = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('id,slug,name,city,website,description,verification_method').eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).lt('verification_level',3).range(from,from+999)
  if (!data?.length) break
  all.push(...data); if (data.length<1000) break; from+=1000
}
console.log(`L2 FV (need verify): ${all.length}`)
const byCity = {}
for (const r of all) byCity[r.city] = (byCity[r.city]||0)+1
for (const [c,n] of Object.entries(byCity).sort((a,b)=>b[1]-a[1])) console.log(`  ${c.padEnd(22)} ${n}`)
console.log('\nFull list:')
for (const r of all) console.log(`  ${r.slug.padEnd(45)} | ${r.name.padEnd(30)} | ${r.city.padEnd(18)} | ${r.website?'web':'no-web'}`)
