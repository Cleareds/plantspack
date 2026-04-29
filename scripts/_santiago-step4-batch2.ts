// Round 3+4 demotions from spot-checking Santiago fully_vegan places.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const updates: Array<{ id: string, label: string, patch: any, reason: string }> = [
  { id: '0a3065b0-15fc-44b4-9859-e75e00a04c63', label: 'Verde Sazón', patch: { vegan_level: 'mostly_vegan' }, reason: '100% vegetarian, ~80% vegan menu (verdesazon.cl); some dishes contain dairy/eggs' },
  { id: 'a8fb8bb3-7c52-49a1-bbc2-7401ac08fe57', label: 'Gopal', patch: { vegan_level: 'mostly_vegan' }, reason: 'Hare Krishna restaurant: vegan AND vegetarian (lacto). Not 100% vegan.' },
  { id: '802ed1b9-cb83-45fa-ab94-3984daed6024', label: 'Porta', patch: { vegan_level: 'vegan_options' }, reason: 'Actually Porta Café (Merced 158) - regular coffee shop with ham/cheese/egg sandwiches. OSM tag was wrong.' },
]

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  for (const u of updates) {
    const { data: row } = await sb.from('places').select('id, name, vegan_level').eq('id', u.id).single()
    if (!row) { console.log(`SKIP ${u.label}`); continue }
    console.log(`\n${u.label}\n  before: vegan_level=${row.vegan_level}\n  patch:  ${JSON.stringify(u.patch)}\n  reason: ${u.reason}`)
    const { error } = await sb.from('places').update(u.patch).eq('id', u.id)
    if (error) { console.log(`  FAIL: ${error.message}`); continue }
    console.log(`  OK`)
  }
}
main()
