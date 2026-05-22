import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { count: totalBr } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').is('archived_at',null)
const { count: fvBr } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null)
const { count: l3Br } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('verification_level',3).is('archived_at',null)
console.log(`BRAZIL TOTALS: ${totalBr} places, ${fvBr} FV, ${l3Br} at L3`)

// Top Brazil cities by FV count
const cities = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('city,vegan_level').eq('country','Brazil').is('archived_at',null).range(from, from+999)
  if (!data?.length) break
  cities.push(...data); if (data.length<1000) break; from+=1000
}
const counts = {}
for (const r of cities) {
  if (!counts[r.city]) counts[r.city] = { total:0, fv:0 }
  counts[r.city].total++
  if (r.vegan_level==='fully_vegan') counts[r.city].fv++
}
const sorted = Object.entries(counts).sort((a,b)=>b[1].fv-a[1].fv).slice(0,15)
console.log('\nTop 15 Brazil cities by FV:')
for (const [c,n] of sorted) console.log(`  ${c.padEnd(28)} ${String(n.total).padStart(5)} places  ${String(n.fv).padStart(4)} FV`)

console.log('\n=== FORTALEZA DETAIL ===')
const { data: fz } = await sb.from('places').select('id,slug,name,vegan_level,verification_level,website,main_image_url,description,last_verified_at,verification_method').eq('country','Brazil').eq('city','Fortaleza').is('archived_at',null).order('vegan_level').order('name')
console.log(`Fortaleza total: ${fz?.length}`)
console.log(`FV: ${fz?.filter(r=>r.vegan_level==='fully_vegan').length}`)
console.log(`Missing image: ${fz?.filter(r=>!r.main_image_url).length}`)
console.log(`Missing website: ${fz?.filter(r=>!r.website).length}`)
console.log(`\nFV venues:`)
for (const r of fz?.filter(r=>r.vegan_level==='fully_vegan') || []) console.log(`  ${r.slug.padEnd(45)} | ${r.name.padEnd(28)} | L${r.verification_level} | ${r.website||'no-web'} | img=${r.main_image_url?'Y':'N'}`)
console.log(`\nMostly+Friendly venues:`)
for (const r of fz?.filter(r=>['mostly_vegan','vegan_friendly'].includes(r.vegan_level)) || []) console.log(`  ${r.slug.padEnd(45)} | ${r.name.padEnd(28)} | ${r.vegan_level} | ${r.website||'no-web'}`)
