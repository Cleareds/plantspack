// Apply the 252 tier D decisions logged in reports/tier-d-decisions.jsonl
// Actions:
//   keep                   - no-op
//   demote_vegan_options   - update vegan_level = 'vegan_options'
//   demote_mostly_vegan    - update vegan_level = 'mostly_vegan'
//   archive                - set archived_at, archived_reason

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
config({ path: '.env.local' })

interface Decision { id: string, name: string, action: string, reason: string }

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const decisions: Decision[] = readFileSync('reports/tier-d-decisions.jsonl', 'utf8')
    .split('\n').filter(Boolean).map(l => JSON.parse(l))

  const now = new Date().toISOString()
  const stats = { keep: 0, vegan_options: 0, mostly_vegan: 0, archive: 0, fail: 0 }

  for (const d of decisions) {
    if (d.action === 'keep') { stats.keep++; continue }
    let patch: any = {}
    if (d.action === 'demote_vegan_options') patch = { vegan_level: 'vegan_options' }
    else if (d.action === 'demote_mostly_vegan') patch = { vegan_level: 'mostly_vegan' }
    else if (d.action === 'archive') patch = { archived_at: now, archived_reason: d.reason }
    else { console.log(`UNKNOWN ${d.name}: ${d.action}`); stats.fail++; continue }
    const { error } = await sb.from('places').update(patch).eq('id', d.id)
    if (error) { console.log(`FAIL ${d.name}: ${error.message}`); stats.fail++; continue }
    if (d.action === 'demote_vegan_options') stats.vegan_options++
    else if (d.action === 'demote_mostly_vegan') stats.mostly_vegan++
    else if (d.action === 'archive') stats.archive++
  }

  console.log(`\nApplied:`)
  console.log(`  Kept (no change):      ${stats.keep}`)
  console.log(`  -> vegan_options:      ${stats.vegan_options}`)
  console.log(`  -> mostly_vegan:       ${stats.mostly_vegan}`)
  console.log(`  Archived:              ${stats.archive}`)
  console.log(`  Failed:                ${stats.fail}`)
  console.log(`  Total processed:       ${decisions.length}`)
}
main()
