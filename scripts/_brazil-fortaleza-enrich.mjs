import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'brazil-fortaleza-enrich-2026-05-21'
const ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

// GreenVegg
const { error: e1 } = await sb.from('places').update({
  address: 'Rua Castro Monte, 1088, Varjota, Fortaleza - CE, Brazil',
  phone: '+55 85 98887-5748',
  description: 'Fully vegan bistro in Varjota district serving lunch with cuisine free of animal-derived ingredients. Operating Wednesday to Sunday, 11:00-15:00.',
  verification_method: TAG,
  last_verified_at: NOW,
  verification_level: 3,
}).eq('slug','greenvegg-fortaleza')
console.log(e1?`✗ ${e1.message}`:'✓ GreenVegg enriched')

// Mandir
const { error: e2 } = await sb.from('places').update({
  address: 'Rua Padre Francisco Pinto, 257, Benfica, Fortaleza - CE 60020-290, Brazil',
  phone: '+55 85 98128-6309',
  description: 'Fully vegan restaurant in Benfica near UFC rectory. Known for vegan feijoada, jackfruit escondidinho and creative plant-based desserts. Operating Monday to Saturday, 11:00-14:30.',
  verification_method: TAG,
  last_verified_at: NOW,
  verification_level: 3,
}).eq('slug','mandir-restaurante-vegano-fortaleza')
console.log(e2?`✗ ${e2.message}`:'✓ Mandir enriched')

// Brazil city canonicalization
const merges = [
  ['Brasília','Brasilia'],
  ['Rio De Janeiro','Rio de Janeiro'],
]
for (const [from, to] of merges) {
  const { data: rows } = await sb.from('places').select('id,slug').eq('country','Brazil').eq('city',from)
  console.log(`\n${from} → ${to}: ${rows?.length} rows to migrate`)
  if (rows?.length) {
    const { error } = await sb.from('places').update({ city: to }).eq('country','Brazil').eq('city',from)
    console.log(error?`✗ ${error.message}`:'✓ migrated')
  }
}

// Flag Pachamama for admin review (conflicting open-status)
const { data: pm } = await sb.from('places').select('id').eq('slug','pachamama-cultural-fortaleza').maybeSingle()
if (pm) {
  await sb.from('place_corrections').insert({
    place_id: pm.id, user_id: ADMIN, status: 'pending',
    corrections: { proposed_action: 'verify_open_status', evidence: 'Recent review reports often closed at advertised times. Status uncertain.' },
    note: 'CLI-REVIEW brazil-fortaleza-2026-05-21: Pachamama Cultural Fortaleza — Google reviewers mention place is often closed when advertised. Admin to verify currently operating.'
  })
  console.log('\n✓ Pachamama Cultural flagged for admin status verification')
}

// Final state
const { count: fz } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('city','Fortaleza').is('archived_at',null)
const { count: fzFv } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('city','Fortaleza').eq('vegan_level','fully_vegan').is('archived_at',null)
console.log(`\nFortaleza now: ${fz} places, ${fzFv} FV`)
