// Steps 1-3 from the Santiago audit:
// 1. Backfill addresses for 4 no-address fully_vegan places
// 2. Demote El Naturista + Runaway Sushi from fully_vegan -> vegan_options
// 3. Update Vegan Bunker address (relocated 2014: Blanco Encalada -> Fresia 529)
//
// Each row is matched by name + city + country to avoid touching wrong rows.
// We log before/after for every change.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

type Update = {
  name: string
  patch: { address?: string; vegan_level?: string }
  reason: string
}

const updates: Update[] = [
  // Step 1: address backfills
  { name: 'Madhu', patch: { address: 'Merced 295b, Lastarria' }, reason: 'address backfill (HappyCow / Foursquare verified)' },
  { name: 'Runaway Sushi Vegan', patch: { address: 'Rancagua 574, Providencia', vegan_level: 'vegan_options' }, reason: 'address + demote: site sells vegan AND classic (non-vegan) sushi' },
  { name: 'Planta Maestra', patch: { address: 'Antonio Varas 1370, Providencia' }, reason: 'address backfill (Yelp - active vegan branch)' },

  // Step 2: vegan_level corrections
  { name: 'El Naturista', patch: { address: 'Moneda 846, Centro Historico', vegan_level: 'vegan_options' }, reason: 'address + demote: Yelp/Tripadvisor list as vegetarian, not fully vegan' },

  // Step 3: stale address from VegGuide (2014 move)
  { name: 'Vegan Bunker', patch: { address: 'Fresia 529, Providencia' }, reason: 'relocated from Av. Blanco Encalada in 2014 (veganbunker.cl)' },
]

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  for (const u of updates) {
    const { data: rows, error } = await sb
      .from('places')
      .select('id, name, address, vegan_level')
      .eq('city', 'Santiago').eq('country', 'Chile').ilike('name', u.name)
    if (error) { console.error(`FAIL lookup ${u.name}:`, error.message); continue }
    if (!rows || rows.length === 0) { console.log(`SKIP  ${u.name} - not found`); continue }
    if (rows.length > 1) { console.log(`SKIP  ${u.name} - ${rows.length} rows match, refusing to bulk-update`); continue }

    const row = rows[0]
    console.log(`\n${u.name} [${row.id}]`)
    console.log(`  before: address="${row.address ?? '∅'}", vegan_level=${row.vegan_level}`)
    console.log(`  patch:  ${JSON.stringify(u.patch)}`)
    console.log(`  reason: ${u.reason}`)

    const { error: upErr } = await sb.from('places').update(u.patch).eq('id', row.id)
    if (upErr) { console.error(`  FAIL update: ${upErr.message}`); continue }
    console.log(`  OK`)
  }
}
main()
