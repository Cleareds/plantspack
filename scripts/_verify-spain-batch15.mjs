import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  '55196d81-f19b-40e0-9f98-8aa4ed29a233', // Good Shit Vegan Kebabs
  'e2b00c56-4f84-4d77-a979-e398028e7300', // El Piano
  '3cd453a7-1fb6-4109-a345-1d2f7e684381', // El Ojú
  '4f379e8d-d3c3-4147-b731-e58103b1ca69', // Páprika
  '1da9df98-5193-4980-9cf5-17139ba1fa9b', // Planeta Vegano
  '50ceb30e-6403-4f38-8772-094c8a5c7e0f', // Che Vegan Café
]
const r = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r.count, 'err:', r.error?.message)
