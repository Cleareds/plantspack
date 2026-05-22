// One more L3 bump for the round 8+9+Bendita venues that just landed
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'brazil-final-l3-bump-2026-05-21'
const all = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('id,tags,verification_method').eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).lt('verification_level',3).range(from,from+999)
  if (!data?.length) break
  all.push(...data); if (data.length<1000) break; from+=1000
}
const bumpable = all.filter(r => {
  const hasTag = (r.tags||[]).some(t => /^brazil-(round|fortaleza|sao-paulo|svb|osm-gap)/.test(t))
  const hasMethod = r.verification_method && /^brazil-/.test(r.verification_method)
  return hasTag || hasMethod
})
console.log(`Pool ${all.length} L2 FV; bumpable ${bumpable.length}`)
let ok = 0
for (let i = 0; i < bumpable.length; i += 50) {
  const chunk = bumpable.slice(i, i+50).map(r=>r.id)
  const { error } = await sb.from('places').update({ verification_level:3, verification_method:TAG, last_verified_at:NOW }).in('id', chunk)
  if (!error) ok += chunk.length
}
console.log(`✓ Promoted ${ok}`)
const { count: l3 } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).eq('verification_level',3)
console.log(`Brazil L3: ${l3}`)
