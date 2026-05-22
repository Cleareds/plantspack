import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { count: br } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').is('archived_at',null)
const { count: fv } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null)
const { count: l3 } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('verification_level',3).is('archived_at',null)
console.log(`BRAZIL: ${br} places, ${fv} FV, ${l3} L3`)
// Top cities by FV
const all = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('city,vegan_level').eq('country','Brazil').is('archived_at',null).range(from, from+999)
  if (!data?.length) break
  all.push(...data); if (data.length<1000) break; from+=1000
}
const counts = {}
for (const r of all) {
  if (!counts[r.city]) counts[r.city] = { total:0, fv:0 }
  counts[r.city].total++
  if (r.vegan_level==='fully_vegan') counts[r.city].fv++
}
console.log('\nTop 30 Brazil cities by FV count:')
const sorted = Object.entries(counts).sort((a,b)=>b[1].fv-a[1].fv).slice(0,30)
for (const [c,n] of sorted) console.log(`  ${c.padEnd(24)} ${String(n.total).padStart(5)} places, ${String(n.fv).padStart(3)} FV`)
