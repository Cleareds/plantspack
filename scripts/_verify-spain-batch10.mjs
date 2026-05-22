import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  '924fe236-a25c-413f-8c18-99edc3904fec', // Fantastic V
  '92e9a8f3-c941-4257-be19-564b2f1a8991', // Dolce&Vegana
  'c49965fc-8cbe-427f-96e9-00a4e6f14bf1', // Vegan Bistró
  '71e6f7cc-c1b3-4a2d-8cbf-524b2cda5549', // La Mujer de Verde
  '479406d5-9f70-4af3-bdbe-d53216ee075f', // Umami Good Food
  '638cbf2b-7e40-430a-a822-79b2f5918b6d', // Sweet Paradise
]
const r = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r.count, 'err:', r.error?.message)
