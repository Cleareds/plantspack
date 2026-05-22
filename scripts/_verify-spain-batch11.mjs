import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  '0cb96aaf-4175-4e97-ba34-fd4183f804ef', // The Nature
  'dbb3e901-5943-4ea3-8999-61ef4d47739f', // Mestiza
  '23254e5a-053c-46dd-b06a-4ea0af4c21bc', // Khambú
  'b68604b3-ff9b-47fd-85d2-618e5ace76be', // Khambú Ruzafa
  'c7849bff-4a7e-49b1-9810-bcf37bb22d5e', // Café Madrigal
  '0e9655a4-3a31-4d5b-a513-09ba346a598c', // Vegetas
]
const r1 = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r1.count, 'err:', r1.error?.message)

// Amberes -> mostly_vegan
const r2 = await sb.from('places').update({
  vegan_level: 'mostly_vegan', is_verified: false,
}, { count: 'exact' }).eq('id', 'ee42b0e4-e168-4d7d-8d7d-cb35bd361254')
console.log('Amberes:', r2.count)
// Tarta de Zanahoria -> vegan_friendly (also serves fish)
const r3 = await sb.from('places').update({
  vegan_level: 'vegan_friendly', is_verified: false,
}, { count: 'exact' }).eq('id', '8d5a90f6-fa2b-4b02-991c-18fecf9c1c6f')
console.log('Tarta:', r3.count)
// Unsushi -> vegan_options (sushi shop with vegan menu alongside traditional fish sushi)
const r4 = await sb.from('places').update({
  vegan_level: 'vegan_options', is_verified: false,
}, { count: 'exact' }).eq('id', '8e6b62ec-a41e-4fa2-914f-9ab0d80e3358')
console.log('Unsushi:', r4.count)
