import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'brazil-crossborder-fix-2026-05-21'

const CITY_TO_COUNTRY = {
  'Rosario':'Argentina','Buenos Aires':'Argentina','Cordoba':'Argentina','Córdoba':'Argentina','Alta Gracia':'Argentina','Mar del Plata':'Argentina','Mendoza':'Argentina','La Plata':'Argentina','Salta':'Argentina','Santa Fe':'Argentina','Tucuman':'Argentina','Tucumán':'Argentina','Bariloche':'Argentina',
  'Asuncion':'Paraguay','Asunción':'Paraguay','Ciudad del Este':'Paraguay',
  'Montevideo':'Uruguay','Punta del Este':'Uruguay','Salto':'Uruguay','Maldonado':'Uruguay',
}
let total = 0
for (const [city, correctCountry] of Object.entries(CITY_TO_COUNTRY)) {
  const { data: rows } = await sb.from('places').select('id,slug').eq('country','Brazil').eq('city',city).is('archived_at',null)
  if (rows?.length) {
    const { error } = await sb.from('places').update({
      country: correctCountry, verification_method: TAG, last_verified_at: NOW,
    }).eq('country','Brazil').eq('city',city)
    if (!error) {
      console.log(`✓ ${city}: ${rows.length} place(s) → ${correctCountry}`)
      total += rows.length
    }
  }
}
console.log(`\nTotal migrated out of Brazil dataset: ${total}`)
