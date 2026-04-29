import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const updates: Array<{ id: string, label: string, patch: any, reason: string }> = [
  { id: 'e01a39f7-c7bf-443b-bd8f-8624a30b3042', label: 'Ramen Ryoma', patch: { vegan_level: 'vegan_options' }, reason: 'Serves slow-cooked pork bone broth alongside vegan ramen (ramenryoma.cl, Yelp)' },
  { id: '4f6c08e5-22ab-4f7f-92ec-f8e25a4c52ad', label: 'Cromo Café', patch: { vegan_level: 'vegan_options' }, reason: 'Coffee/pastry shop with traditional AND vegan options (Yelp Aug 2025)' },
  { id: '470b1cb3-cf1c-491f-9bea-da69a3df698f', label: 'OH! Salad Garden', patch: { vegan_level: 'vegan_options' }, reason: 'Salad chain with vegetarian + vegan options, not fully vegan (Tripadvisor, Yelp)' },
  { id: '99c86488-6108-49cb-9938-eb87a625f108', label: 'Manatí', patch: { vegan_level: 'mostly_vegan' }, reason: 'Vegetariana y vegana sandwich shop (manativegetariano.cl) - has dairy/egg items' },
  { id: 'c4775ffd-9e9d-4ba0-a310-a5aa815f0eec', label: 'El Árbol Restaurant', patch: { vegan_level: 'mostly_vegan' }, reason: 'Vegetarian + vegan restaurant (elarbolrestaurant.cl); not 100% vegan' },
  { id: 'c35f16c8-1c45-438e-b39a-eb1ca2cdc5d9', label: 'El Chancho Seis', patch: { vegan_level: 'mostly_vegan' }, reason: 'Vegan/vegetarian restaurant in Yungay (restoranelchanchoseis.cl); menu mostly vegan with vegetarian items' },
]

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  for (const u of updates) {
    const { data: row } = await sb.from('places').select('id, name, vegan_level').eq('id', u.id).single()
    if (!row) { console.log(`SKIP ${u.label} - not found`); continue }
    console.log(`\n${u.label} [${u.id}]`)
    console.log(`  before: vegan_level=${row.vegan_level}`)
    console.log(`  patch:  ${JSON.stringify(u.patch)}`)
    console.log(`  reason: ${u.reason}`)
    const { error } = await sb.from('places').update(u.patch).eq('id', u.id)
    if (error) { console.log(`  FAIL: ${error.message}`); continue }
    console.log(`  OK`)
  }
}
main()
