import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const verifyIds = [
  '7a1fc568-dc22-4298-8039-2c9820e7c6c9', // Punto Vegano
  '8e603939-b504-44fc-a6c9-405044ed431e', // Plantamientos
  '956b7e34-70ed-4c79-94c8-4ac5dcd47c41', // The Vegan Roll
  '97ce9628-5e8e-47c9-a5da-04ee7fa7a9ba', // Freedom Pizza
  '993ae32d-d170-4354-abc1-6e0af18e29d0', // Los Andenes dup
  'a1ccd5e3-1f4e-47c4-848a-363cd84385bf', // Delish Vegan Doughnuts
  'b2381bb5-eafb-4d9a-8420-ee1043503dd8', // Mad Mad Vegan dup
  'bc0ea1de-fdfb-4fec-a95d-370e1b9e7574', // La Oveja Negra
  '036b3241-f2fa-4572-bdf4-aa6e96cb0bdc', // Thunder
  '6ebf7495-6dbc-485c-a7a8-0dbc03ec2a39', // Musgo
]
const r = await sb.from('places').update({
  is_verified: true,
  last_verified_at: new Date().toISOString(),
  verification_method: 'editorial-web-2026-05-15',
  verification_level: 3,
}, { count: 'exact' }).in('id', verifyIds)
console.log('verified:', r.count, 'err:', r.error?.message)
