import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'brazil-vf-sample-2026-05-21'
const ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

// Decisions from WebSearch verification of 10-place sample
const decisions = [
  { slug: 'raw-porto-alegre-porto-alegre', action: 'promote', new_level: 'fully_vegan', reason: 'Own site says "totally vegan"; HappyCow lists fully vegan. Padre Chagas 318.' },
  { slug: 'vegana-chacara-rio-de-janeiro', action: 'archive', reason: 'Permanently closed; replaced by Vegan Vegan (different ownership). Foursquare: "Agora fechado".' },
  { slug: 'ayurvedic-tulassi-bistro-sao-paulo-brazil', action: 'downgrade', new_level: 'mostly_vegan', reason: 'Vegetarian Indian/ayurvedic — not fully vegan' },
  { slug: 'anna-prem-sao-paulo-brazil', action: 'downgrade', new_level: 'mostly_vegan', reason: 'Vegetarian + vegan dishes daily; not 100% vegan' },
  { slug: 'casa-oriental', action: 'downgrade', new_level: 'mostly_vegan', reason: 'Vegetarian Chinese restaurant (has dairy/eggs); "Buffet Vegano" is one option' },
  { slug: 'vegecoop-rio-de-janeiro', action: 'downgrade', new_level: 'mostly_vegan', reason: 'Vegetarian buffet since 1962; not 100% vegan (has dairy items)' },
  { slug: 'amor-a-natureza', action: 'downgrade', new_level: 'mostly_vegan', reason: 'Ovo-lacto-vegetarian restaurant with daily vegan options (own site)' },
  { slug: 'baalbek', action: 'downgrade', new_level: 'vegan_options', reason: 'Traditional Lebanese with meat + vegetarian options; not vegan-focused' },
  { slug: 'sabor-vital', action: 'downgrade', new_level: 'vegan_options', reason: 'Natural restaurant serving some meat options per Bahia Terra; not strictly vegetarian' },
]

let promoted = 0, downgraded = 0, archived = 0
for (const d of decisions) {
  if (d.action === 'promote') {
    const { error } = await sb.from('places').update({ vegan_level: d.new_level, verification_method: TAG, verification_level: 3, last_verified_at: NOW }).eq('slug', d.slug).eq('country','Brazil')
    if (!error) { promoted++; console.log(`✓ PROMOTE ${d.slug} → ${d.new_level}: ${d.reason.slice(0,60)}`) } else console.log(`✗ ${d.slug}: ${error.message}`)
  } else if (d.action === 'downgrade') {
    const { error } = await sb.from('places').update({ vegan_level: d.new_level, verification_method: TAG, last_verified_at: NOW }).eq('slug', d.slug).eq('country','Brazil')
    if (!error) { downgraded++; console.log(`↓ DOWNGRADE ${d.slug} → ${d.new_level}: ${d.reason.slice(0,60)}`) } else console.log(`✗ ${d.slug}: ${error.message}`)
  } else if (d.action === 'archive') {
    const { error } = await sb.from('places').update({ archived_at: NOW, verification_method: TAG }).eq('slug', d.slug).eq('country','Brazil')
    if (!error) { archived++; console.log(`× ARCHIVE ${d.slug}: ${d.reason.slice(0,60)}`) } else console.log(`✗ ${d.slug}: ${error.message}`)
  }
}
console.log(`\n9 vegan_friendly samples resolved: ${promoted} promote, ${downgraded} downgrade, ${archived} archive`)
