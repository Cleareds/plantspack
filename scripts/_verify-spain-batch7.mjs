import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  'fc1068b0-8c69-4b33-ab50-81618c44b6f8', // Cookaluzka
  '1c693129-090e-489e-bf19-cdf09ef949dd', // Frutas Prohibidas
  'c75eba68-7fa5-481c-9bea-8adb87c7237a', // Viva Chapata
  'e64dbb0a-04dc-4694-9ad0-7518d5993a31', // Masa Madre
  'e3bbe880-4e23-45eb-b783-2f25d7799637', // Los Andenes
  'c8695af0-1014-41e4-ad83-5acff94975c0', // Doxa Plant Based
]
const r1 = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r1.count, 'err:', r1.error?.message)

// Viva la Vida -> mostly_vegan (vegetarian buffet with vegan items)
const r2 = await sb.from('places').update({
  vegan_level: 'mostly_vegan',
  is_verified: false,
}, { count: 'exact' }).eq('id', 'feb4c563-e6b4-4a2c-b45a-c9d5948f404f')
console.log('Viva la Vida downgrade:', r2.count, 'err:', r2.error?.message)
