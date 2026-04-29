import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const now = new Date().toISOString()

  // 1. Comida Vegana - archive: address conflicts with non-vegan establishment.
  const comidaVegana = '10f69bf8-a403-4f67-8c31-e656b7ae0610'
  const { error: e1 } = await sb.from('places').update({
    archived_at: now,
    archived_reason: 'Cannot verify. Address Sazie 2158 corresponds to "La Terraza De Sazie" (non-vegan Chilean restaurant). The nearby Hare Krishna spot "Abhay Charan" at Sazie 2180 is fully vegan. This row may be a defunct stall or a mistagged OSM node.',
  }).eq('id', comidaVegana)
  console.log(`Comida Vegana: ${e1 ? 'FAIL ' + e1.message : 'archived'}`)

  // 2. Comida Go Vegan - keep fully_vegan, update address to verified Galpon location.
  const comidaGoVegan = '3c9edf4f-0b91-4fe1-aa54-b26127a145f8'
  const { error: e2 } = await sb.from('places').update({
    address: 'Galpon Bio Bio, Victor Manuel 2241, local 4',
    description: 'Weekend vegan food pop-up at Galpon Bio Bio. Open Sat/Sun/holidays 13:00-17:00. Active on Instagram @comida_goovegan.',
  }).eq('id', comidaGoVegan)
  console.log(`Comida Go Vegan: ${e2 ? 'FAIL ' + e2.message : 'address updated'}`)

  // 3. Vegan Soul - keep fully_vegan, update address (was wrong San Isidro street).
  const veganSoul = '6bfc0958-194f-4bdd-9209-04bd36e8c5f3'
  const { error: e3 } = await sb.from('places').update({
    address: 'Malaquias Concha 0345, Nunoa',
  }).eq('id', veganSoul)
  console.log(`Vegan Soul: ${e3 ? 'FAIL ' + e3.message : 'address updated'}`)
}
main()
