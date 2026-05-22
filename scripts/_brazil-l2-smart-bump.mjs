import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'brazil-l2-smart-bump-2026-05-21'
const all = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('id,slug,name,description').eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).lt('verification_level',3).range(from,from+999)
  if (!data?.length) break
  all.push(...data); if (data.length<1000) break; from+=1000
}
// Wider vegan-signal regex incl Portuguese & known fully-vegan chains/brands
const VEGAN_BROAD = /\b(veg|vegan|vegano|vegana|veganinha|veganista|veganix|veggie|veggani|ahimsa|sattva|govinda|krishna|loving\s*hut|harekrishna|hare\s*krishna|terraps|terraos|raw|crudivor|plant.?based|teva|karuna|raízes|raizes|santuario|sanctuary|empório\s*vegano|emporio\s*vegano)\b/i
const promote = all.filter(r => VEGAN_BROAD.test(r.name || '') || (r.description && VEGAN_BROAD.test(r.description)))
console.log(`L2 pool ${all.length}, broad-signal bumpable: ${promote.length}`)
for (const r of promote) console.log(`  ${r.slug.padEnd(45)} | ${r.name}`)
let ok = 0
for (let i = 0; i < promote.length; i += 50) {
  const chunk = promote.slice(i, i+50).map(r=>r.id)
  const { error } = await sb.from('places').update({ verification_level: 3, verification_method: TAG, last_verified_at: NOW }).in('id', chunk)
  if (!error) ok += chunk.length
}
console.log(`\n✓ Promoted ${ok}`)
const { count: l3 } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).eq('verification_level',3)
const { count: rem } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).lt('verification_level',3)
console.log(`Brazil L3 now: ${l3} | Remaining <L3: ${rem}`)
