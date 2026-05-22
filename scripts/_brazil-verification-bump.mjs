// Bulk-promote Brazil FV places to verification_level=3 when they carry a positive trust signal
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'brazil-verification-bump-2026-05-21'

const all = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('id,slug,name,description,source_id,verification_level,verification_method,tags')
    .eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).lt('verification_level',3).range(from,from+999)
  if (!data?.length) break
  all.push(...data); if (data.length<1000) break; from+=1000
}
console.log(`Pool: ${all.length} FV with verification_level < 3`)

const VEGAN_NAME = /\b(vegan|vegano|vegana|veganos|veganas|veggie|veg\b|plant-?based|pflanzlich|herbivor|gouranga|hare\s*krishna|veg\s|veg$)\b/i
const VEGAN_DESC = /\b(100%?\s*vegan|fully vegan|completely vegan|exclusively vegan|todo vegano|toda vegana|todas vegan|todos vegan|comida vegana|cozinha vegana|cardápio vegano|menu vegano|sem produtos animais|sem ingredientes animais|plant-based|comida 100% vegana|100% vegana)\b/i
const RECENT_AUDIT = /^(brazil-(fortaleza|sao-paulo|round\d|veganfreundlich|verification-bump|midtier|enrich|friendly-fix|crossborder)|fortaleza-|sao-paulo-)/i

const promote = []
for (const r of all) {
  const hasName = VEGAN_NAME.test(r.name||'')
  const hasDesc = r.description && VEGAN_DESC.test(r.description)
  const recentAudit = r.verification_method && RECENT_AUDIT.test(r.verification_method)
  const hasOsm = (r.source_id||'').startsWith('osm-')
  if (hasOsm || hasName || hasDesc || recentAudit) promote.push(r.id)
}
console.log(`To promote: ${promote.length}`)

let ok = 0
for (let i = 0; i < promote.length; i += 50) {
  const chunk = promote.slice(i, i+50)
  const { error } = await sb.from('places').update({
    verification_level: 3,
    verification_method: TAG,
    last_verified_at: NOW,
  }).in('id', chunk)
  if (!error) ok += chunk.length
}
console.log(`✓ Promoted ${ok}`)

const { count: l3 } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('verification_level',3).is('archived_at',null)
console.log(`Brazil L3 now: ${l3}`)
