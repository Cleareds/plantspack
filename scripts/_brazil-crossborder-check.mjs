import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
// Known Argentine/Uruguayan/Paraguayan cities that may have slipped in
const NON_BR_CITIES = ['Rosario','Buenos Aires','Cordoba','Córdoba','Alta Gracia','Mar del Plata','Mendoza','La Plata','Salta','Santa Fe','Tucuman','Tucumán','Bariloche','Asuncion','Asunción','Ciudad del Este','Montevideo','Punta del Este','Salto','Maldonado','Mexico City','Ciudad de Mexico']
const all = []
for (const c of NON_BR_CITIES) {
  const { data } = await sb.from('places').select('id,slug,name,city,country').eq('country','Brazil').eq('city',c).is('archived_at',null)
  if (data?.length) all.push(...data.map(r => ({ ...r, _detected: c })))
}
console.log(`Cross-border in Brazil dataset: ${all.length}`)
for (const r of all) console.log(`  ${r.slug.padEnd(45)} | ${r.name.padEnd(30)} | city="${r.city}" → likely outside Brazil`)
