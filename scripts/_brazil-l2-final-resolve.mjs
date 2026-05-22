import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'brazil-l2-websearch-resolve-2026-05-21'
const ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

// Confirmed FV → promote to L3
const promotions = [
  ['boteco-ouzar-sao-paulo', 'Boteco Ouzar SP — 100% vegan since 2017 (Vista-se + own site confirm)'],
  ['sol-da-terra-vitoria', 'Sol da Terra Vitória — fully vegan buffet (Spinach Guide + Veganizze confirm)'],
  ['taste-and-see-sao-paulo', 'Taste and See — "Plant Based | Vegano" per own site'],
  ['taste-and-see-sao-paulo-brazil', 'Taste and See (duplicate) — same brand'],
  ['harmonia-de-terra-camboriu', 'Harmonia da Terra — strictly vegan since 2006 (SVB confirmed)'],
  ['cajucaju-aguas-de-sao-pedro', 'CajuCaju — 100% vegan / plant-based (own site confirms)'],
  ['vegetalle-campinas', 'Vegetalle — 100% vegan confirmed (own site + Conheça Campinas)'],
]
for (const [slug, reason] of promotions) {
  const { error } = await sb.from('places').update({
    verification_level: 3, verification_method: TAG, last_verified_at: NOW,
  }).eq('slug', slug).eq('country','Brazil')
  console.log(error?`✗ ${slug}: ${error.message}`:`✓ ${slug} → L3`)
}

// Confirmed NOT 100% vegan → downgrade
const downgrades = [
  ['a-casa-natal', 'vegan_friendly', 'vegetarian restaurant per aventure-se + Papacapim'],
  ['tudo-em-graos-santa-maria', 'vegan_options', 'natural products store chain; sells vegan + non-vegan (sugars, refined items)'],
  ['mae-natureza-belem', 'vegan_friendly', 'vegetarian restaurant with vegan options per Tripadvisor + Guia da Semana'],
  ['alecrim-atibaia', 'vegan_friendly', 'vegetarian + vegan; business registration shows INACTIVE — flagged'],
]
for (const [slug, level, reason] of downgrades) {
  const { error } = await sb.from('places').update({
    vegan_level: level, verification_method: TAG, last_verified_at: NOW,
  }).eq('slug', slug).eq('country','Brazil')
  console.log(error?`✗ ${slug}: ${error.message}`:`↓ ${slug} → ${level} (${reason.slice(0,55)})`)
}

// Flag Alecrim Atibaia for open-status review (registration inactive)
const { data: alecrim } = await sb.from('places').select('id').eq('slug','alecrim-atibaia').maybeSingle()
if (alecrim) {
  await sb.from('place_corrections').insert({
    place_id: alecrim.id, user_id: ADMIN, status: 'pending',
    corrections: { proposed_action: 'verify_open_status_or_archive', evidence: 'CNPJ business registration shows INACTIVE per Serasa Experian; may be permanently closed.' },
    note: 'CLI-REVIEW brazil-l2-websearch-2026-05-21: Alecrim Atibaia business registration inactive. Admin to verify operating status or archive.'
  })
  console.log('✓ Alecrim Atibaia queued for admin review')
}

const { count: l3 } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).eq('verification_level',3)
const { count: rem } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).lt('verification_level',3)
const { count: fv } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null)
console.log(`\nBrazil FV: ${fv}, L3: ${l3}, <L3: ${rem}`)
