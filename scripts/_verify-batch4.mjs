import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  '85f36fed-023e-4f03-9a79-9ff634465c20', // Romeow
  '9012d1ea-f040-41bc-bffc-7cb4dda0e5f9', // Julietta
  'c0c6a686-6a3f-4bd7-9d18-82c5a47b7af9', // Flower Burger Gracchi
]
const r1 = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r1.count, 'err:', r1.error?.message)
const r2 = await sb.from('places').update({
  vegan_level: 'vegan_friendly',
  is_verified: false,
}, { count: 'exact' }).eq('id', 'abfb97cc-9d57-47f3-994a-e32fff12ccf3') // BiOsteria Saltatempo
console.log('downgraded:', r2.count, 'err:', r2.error?.message)
