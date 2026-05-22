import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  '629f96c7-d584-4323-a7c8-7ee89d7ee3f4', // Loving Hut Madrid
  '1e180a13-1071-4820-b933-4cb50f536aa6', // Chillin Cafe
  '4e5e5e07-f52c-4bc2-baf6-90b9909d3f7f', // Loving Hut Valencia
]
const r1 = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r1.count, 'err:', r1.error?.message)

// Downgrades: Malmö, La Lluna, La Regadera -> mostly_vegan; Ana Eva -> vegan_friendly
const r2 = await sb.from('places').update({
  vegan_level: 'mostly_vegan', is_verified: false,
}, { count: 'exact' }).in('id', [
  '3af1260a-58ca-4a63-8795-3970eaad74ed', // Malmö
  'e7d16ebe-acca-458f-9f35-3979f493ba3e', // La Lluna
  '7c2edf88-4964-4309-a963-a858c0721e6c', // La Regadera
])
console.log('mostly_vegan:', r2.count)

const r3 = await sb.from('places').update({
  vegan_level: 'vegan_friendly', is_verified: false,
}, { count: 'exact' }).eq('id', '1564f74e-3de1-4f9b-a0cd-a2dfacf4798e') // Ana Eva
console.log('Ana Eva:', r3.count)
