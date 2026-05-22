import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  '4199839b-35dc-4337-b7c7-8649ad4b00b7', // PASTAn
  '92e3544c-55ee-4bd9-83b4-2e8c5519b86b', // Tonka
  '26bdf78f-020c-448b-9c0f-2f6dd43f602f', // Simbiosis Ibiza
  'dab7085f-7929-49df-a30d-6104cb4efeae', // Aymat
  'e234130b-672f-44fd-be73-9b5815c51243', // Don Gato Bar
  'c402b4d4-3a31-4a98-b178-02e491a38082', // La Alpargata
]
const r = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r.count, 'err:', r.error?.message)
