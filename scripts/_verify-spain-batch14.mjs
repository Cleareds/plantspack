import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  '4b57ffca-21f4-4db1-82a1-3ef8e053869b', // Ecocentre
  '7769d62a-5958-4927-ad7f-652ccab00b52', // La Golosa
  '4b40e4b7-aaa6-4a0a-9541-cff2cfe196e9', // La Besneta
  '7548a826-5c07-4dfb-8211-22a201af222b', // Eqvilibrivm
  '06031c1f-53c3-448b-904e-9d9e813ba9b1', // Wild Food BCN
]
const r = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r.count, 'err:', r.error?.message)
