import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  'c46a71a9-b04a-4d66-97fc-07d2fe2dd5e1', // Asante Cafe
  '3a336616-365f-4741-82c1-537b705e75e2', // Natury
  'b6090e49-2bcf-44a2-83f1-fc167b9725cf', // Mango & Caoba
  'f443a79d-2a76-4fa0-962f-f96483b161fb', // Santa Vegana
  '799fabe8-6e2e-4e43-9b9a-5716ff8f11ae', // Morgentau
  '91496728-5104-4270-a445-710dbaf3eb2a', // Areca Bakery
]
const r1 = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r1.count, 'err:', r1.error?.message)

// Bar Celoneta -> mostly_vegan (vegetarian+vegan)
const r2 = await sb.from('places').update({
  vegan_level: 'mostly_vegan',
  is_verified: false,
}, { count: 'exact' }).eq('id', 'c324d9c7-dfa7-43b8-9545-1bcf431ecfb3')
console.log('Bar Celoneta downgrade:', r2.count, 'err:', r2.error?.message)
