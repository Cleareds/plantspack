// Per-row fixes for Planta Maestra (3 rows = 2 branches + 1 duplicate)
// and El Naturista (2 rows = 2 branches, both vegetarian).
// IDs are pinned so we cannot accidentally touch the wrong row.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

type Update = { id: string, label: string, patch: Record<string, any>, reason: string }

const updates: Update[] = [
  // El Naturista, Moneda 846 (Centro Historico) - already mostly_vegan, demote further
  {
    id: '521924f6-d0f1-49be-bf92-6a24bd5b9602',
    label: 'El Naturista (Moneda 846)',
    patch: { vegan_level: 'vegan_options' },
    reason: 'Vegetarian restaurant since 1927 with vegan options - not majority vegan',
  },
  // El Naturista, Rosario Norte 532 (Las Condes branch) - backfill + demote
  {
    id: '74c89a85-5916-4b88-abd0-f5ffe80b34d3',
    label: 'El Naturista (Rosario Norte branch)',
    patch: { address: 'Rosario Norte 532, Las Condes', vegan_level: 'vegan_options' },
    reason: 'Las Condes branch of vegetarian El Naturista - backfill address + demote',
  },
  // Planta Maestra, Merced (Centro/Lastarria) - has stale OSM-formatted address
  {
    id: '7a00cf26-441c-46a9-83fb-967cc037edb7',
    label: 'Planta Maestra (Merced/Lastarria)',
    patch: { address: 'Merced 295c, Lastarria' },
    reason: 'Verified address (Yelp June 2025); was "Merced, 8320000 Santiago"',
  },
  // Planta Maestra, duplicate of Merced row - backfill address so it is at least usable
  {
    id: 'd4873e70-8743-4260-a5fd-a34fe6515491',
    label: 'Planta Maestra (duplicate of Merced)',
    patch: { address: 'Merced 295c, Lastarria' },
    reason: 'Same coords as the Merced row; appears to be a re-import duplicate. Backfilling address; deduplication needs separate human review (per data policy, no DELETE without "Yes delete")',
  },
]

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  for (const u of updates) {
    const { data: row } = await sb.from('places').select('id, name, address, vegan_level').eq('id', u.id).single()
    if (!row) { console.log(`SKIP  ${u.label} - id not found`); continue }
    console.log(`\n${u.label} [${u.id}]`)
    console.log(`  before: address="${row.address ?? '∅'}", vegan_level=${row.vegan_level}`)
    console.log(`  patch:  ${JSON.stringify(u.patch)}`)
    console.log(`  reason: ${u.reason}`)
    const { error } = await sb.from('places').update(u.patch).eq('id', u.id)
    if (error) { console.log(`  FAIL: ${error.message}`); continue }
    console.log(`  OK`)
  }
}
main()
