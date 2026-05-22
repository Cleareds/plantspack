import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  'c63de601-d62f-4ac6-8301-d685d59879e5', // V Market
  'c6856727-735b-455e-8746-8ddc539140c7', // Veganashi
  'a78cf479-2dd0-417b-a2a6-b9af5704cd71', // Vacka
  '0e6a9e72-d07d-4083-ae2f-40c13f28c515', // The Vegan Corner
  'eb697ada-0045-4fc9-a5c9-7e90c9caf074', // Mundo Vegan
  'e1e310f5-c006-4467-b476-fb98f0ff95ad', // Blu Bar
  '261d5f66-2288-4e7f-a52c-89efef467ed6', // Hanai
]
const r1 = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r1.count, 'err:', r1.error?.message)

// Santa Clara -> vegan_options (bakery with vegan options among traditional)
const r2 = await sb.from('places').update({
  vegan_level: 'vegan_options',
  is_verified: false,
}, { count: 'exact' }).eq('id', '76ebb6a8-1461-4415-93dc-c931e25583dc')
console.log('Santa Clara downgrade:', r2.count, 'err:', r2.error?.message)
