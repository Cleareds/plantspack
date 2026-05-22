import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'brazil-vf-audit-batch2-2026-05-21'

const decisions = [
  { slug: 'so-verde', action: 'promote', new_level: 'fully_vegan', reason: 'Multiple sources (own site + Wheree + Nova Circle) confirm fully vegan Brazilian restaurant in Botafogo' },
  { slug: 'hareburger-rio-de-janeiro', action: 'downgrade', new_level: 'mostly_vegan', reason: 'Hare Krishna vegetarian fast-food chain (uses dairy); not 100% vegan' },
  { slug: 'a-tribo', action: 'downgrade', new_level: 'mostly_vegan', reason: 'Vegetarian/vegan natural restaurant; not 100% vegan' },
  { slug: 'greens', action: 'downgrade', new_level: 'mostly_vegan', reason: 'Natural restaurant with vegan/vegetarian/light options; not 100% vegan' },
  { slug: 'suprem', action: 'downgrade', new_level: 'mostly_vegan', reason: 'Lacto-vegetarian Indian; vegan versions available but base is vegetarian' },
  { slug: 'alcachofra', action: 'downgrade', new_level: 'mostly_vegan', reason: 'Vegetarian + vegan; "nearly all dishes vegan" but full-vegan only on Mondays' },
  { slug: 'endivia', action: 'downgrade', new_level: 'mostly_vegan', reason: 'Name "Endívia Restaurante Vegetariano" — vegetarian first, vegan options' },
  { slug: 'poke-garden', action: 'downgrade', new_level: 'vegan_options', reason: 'Hawaiian poke serving salmon, tuna, chicken; shimeji is the only vegan protein' },
  { slug: 'amoa-bakery', action: 'downgrade', new_level: 'mostly_vegan', reason: 'Gluten-free bakery; some breads contain eggs and honey, not fully vegan' },
  { slug: 'prato-verde', action: 'downgrade', new_level: 'mostly_vegan', reason: 'Vegetarian buffet since 1991 (32 years); only Thursday is fully vegan' },
]
let p=0, d=0
for (const dec of decisions) {
  const update = { verification_method: TAG, last_verified_at: NOW }
  if (dec.action === 'promote') { update.vegan_level = dec.new_level; update.verification_level = 3 }
  else if (dec.action === 'downgrade') update.vegan_level = dec.new_level
  const { error } = await sb.from('places').update(update).eq('slug', dec.slug).eq('country','Brazil')
  if (!error) {
    if (dec.action==='promote') p++; else d++
    console.log(`${dec.action==='promote'?'✓ PROMOTE':'↓ DOWNGRADE'} ${dec.slug.padEnd(35)} → ${dec.new_level}: ${dec.reason.slice(0,55)}`)
  } else console.log(`✗ ${dec.slug}: ${error.message}`)
}
console.log(`\nBatch 2: ${p} promote, ${d} downgrade`)
