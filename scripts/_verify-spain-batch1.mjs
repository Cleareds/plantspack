import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const verifyIds = [
  '2675f97f-c18c-45d8-a754-b80104d4d1f0', // Desoriente
  '65c6a52d-08eb-496a-9e8d-468d45e49bec', // Mad Mad Vegan
  '277f1f1b-abf6-4e62-bee1-be66ac17311d', // Velada
  '3a12ab00-fffc-44c4-b0e1-709170d2e480', // Vrutal
  '2d934c90-f78b-41fc-a325-d069fa68dee7', // Vegan Mount
  'ec288e5e-8111-4c34-8800-85b1fed1a6fe', // CatBar
  '25c05adc-9b5b-473f-a676-a0ec63d5011b', // Cat Bar dup
]
const r1 = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r1.count, 'err:', r1.error?.message)

// Downgrade Miquetes -> mostly_vegan (macrobiotic, 90% vegan)
const r2 = await sb.from('places').update({
  vegan_level: 'mostly_vegan',
  is_verified: false,
}, { count: 'exact' }).eq('id', 'c60d995f-e515-4ee8-9b65-1ec16ec6e48d')
console.log('downgrade Miquetes:', r2.count, 'err:', r2.error?.message)

// Chök rows: previously vegan, now GF with vegan options -> downgrade to vegan_options
const chokIds = ['f2978feb-dd64-429b-8f5a-6121c4908418', '2e842747-fb26-40f7-b82c-f7867b140289', '7a307e9b-48b5-48e7-8777-0c23e783c2b8']
const r3 = await sb.from('places').update({
  vegan_level: 'vegan_options',
  is_verified: false,
}, { count: 'exact' }).in('id', chokIds)
console.log('downgrade Chök:', r3.count, 'err:', r3.error?.message)
