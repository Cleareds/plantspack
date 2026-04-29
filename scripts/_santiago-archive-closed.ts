// Soft-archive places confirmed closed via web search.
// Uses archived_at + archived_reason - no DELETE per data policy.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const closures: Array<{ id: string, label: string, reason: string }> = [
  { id: '941e2433-6c09-48e8-93d0-6efba6b0af95', label: 'Herbivore (Herbivoro)', reason: 'Confirmed closed since ~2015 (Foursquare). Was at Av. Rancagua 188, Providencia.' },
  { id: '56704498-4738-4abd-91ff-ddc40bf661c8', label: 'Lazy vegan', reason: 'Marked CLOSED on HappyCow. Was at Av. Condell 1612, Nunoa.' },
]

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const now = new Date().toISOString()
  for (const c of closures) {
    const { data: row } = await sb.from('places').select('id, name, archived_at').eq('id', c.id).single()
    if (!row) { console.log(`SKIP ${c.label}`); continue }
    if (row.archived_at) { console.log(`SKIP ${c.label} - already archived at ${row.archived_at}`); continue }
    console.log(`\n${c.label}\n  reason: ${c.reason}`)
    const { error } = await sb.from('places')
      .update({ archived_at: now, archived_reason: c.reason })
      .eq('id', c.id)
    if (error) { console.log(`  FAIL: ${error.message}`); continue }
    console.log(`  OK - archived ${now}`)
  }
}
main()
