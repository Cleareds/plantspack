import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  '96c6502e-3ce3-4fec-82d4-8175d009a3f9',
  '98ffb253-3863-4c0c-9293-f545ddebcc46',
  '9cc5d7aa-c9a0-4ea8-a085-bfb34bbdb8d0',
  'eb5d45a9-7a6d-4451-a174-24eb51fae8bb',
  'f51239b0-c569-4fea-964f-b5dda417335a',
  '74ee42a3-a312-4652-9a45-33a2d506c7ed',
]
const { error, count } = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', count, 'err:', error?.message)
