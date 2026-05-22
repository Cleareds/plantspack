import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  '7d7d07d0-d17d-437d-aed8-ca720c356a93', // Vegan Junk Food Bar
  'af05e84e-674f-4de0-b5ca-c241492a178d', // Veggie Garden
  'dc427bbe-dd49-4743-b5d3-beb96051ade6', // Veggie Garden dup
  '0bb40bc0-906b-4e8e-b5b9-96307e4e2a9d', // Petit Brot
  '385d3ef4-c7df-46ec-aae3-56f0ab36cc0f', // Hicuri
]
const r = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r.count, 'err:', r.error?.message)
