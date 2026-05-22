import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  '3248385b-a434-4cb9-aa10-0d387cc2df40', // La Petita Vegana
  '1018f3d2-37ad-46f2-9e80-aa59cb6b14c3', // La Capritxeria
  '1571fdb3-ac77-4b25-81bf-8cae6a1d1611', // La Perra Verde
  '02aa26b0-ff45-47fa-9a44-4e0163d38cdb', // Pötstot
  '7b83cffb-1187-4864-a92c-25149e7b58d3', // Grans de la Terra
  '140c35f0-a48f-42cd-9022-66cb8b5bc421', // Falafel of Shani
  '18c4e93d-e243-4ba0-885c-3f8826e28753', // Maoz Falafel
]
const r = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r.count, 'err:', r.error?.message)
