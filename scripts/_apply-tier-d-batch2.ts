// Apply only the new (last 86) Tier D decisions, skipping already-applied ones.
// Handles already-archived/already-demoted rows safely.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
config({ path: '.env.local' })

interface Decision { id: string, name: string, action: string, reason: string }

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const all: Decision[] = readFileSync('reports/tier-d-decisions.jsonl', 'utf8')
    .split('\n').filter(Boolean).map(l => JSON.parse(l))
  const decisions = all.slice(-86) // only the new 86

  const now = new Date().toISOString()
  const stats = { keep: 0, vegan_options: 0, mostly_vegan: 0, archive: 0, fail: 0, skip: 0 }

  for (const d of decisions) {
    if (d.action === 'keep') { stats.keep++; continue }
    // Read current state to be idempotent.
    const { data: row } = await sb.from('places')
      .select('id, vegan_level, archived_at').eq('id', d.id).single()
    if (!row) { console.log(`SKIP ${d.name} - not found`); stats.fail++; continue }

    let patch: any = {}
    if (d.action === 'demote_vegan_options') {
      if (row.vegan_level === 'vegan_options') { stats.skip++; continue }
      patch = { vegan_level: 'vegan_options' }
    } else if (d.action === 'demote_mostly_vegan') {
      if (row.vegan_level === 'mostly_vegan') { stats.skip++; continue }
      patch = { vegan_level: 'mostly_vegan' }
    } else if (d.action === 'archive') {
      if (row.archived_at) { stats.skip++; continue }
      patch = { archived_at: now, archived_reason: d.reason }
    } else { console.log(`UNKNOWN ${d.name}: ${d.action}`); stats.fail++; continue }

    const { error } = await sb.from('places').update(patch).eq('id', d.id)
    if (error) { console.log(`FAIL ${d.name}: ${error.message}`); stats.fail++; continue }
    if (d.action === 'demote_vegan_options') stats.vegan_options++
    else if (d.action === 'demote_mostly_vegan') stats.mostly_vegan++
    else if (d.action === 'archive') stats.archive++
  }

  console.log(`\nApplied (last 86 decisions only):`)
  console.log(`  Kept (no change):     ${stats.keep}`)
  console.log(`  -> vegan_options:     ${stats.vegan_options}`)
  console.log(`  -> mostly_vegan:      ${stats.mostly_vegan}`)
  console.log(`  Archived:             ${stats.archive}`)
  console.log(`  Skipped (already):    ${stats.skip}`)
  console.log(`  Failed:               ${stats.fail}`)
}
main()
