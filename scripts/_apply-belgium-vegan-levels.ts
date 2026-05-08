/**
 * Apply Belgium vegan_level changes from ChatGPT audit (plantspack_belgium_changes_needed.csv).
 *
 *   --dry-run   default: print what would change, write nothing
 *   --commit    write changes
 *
 * Inputs: scripts/seo-out/belgium-vegan-levels.json (built from CSV)
 * Buckets:
 *   demote_to_vo   - 52 vegan_friendly -> vegan_options (mainstream chains, snack bars)
 *   demote_to_mv   - 3 vegan_friendly -> mostly_vegan (cigkofte chains)
 *   upgrade_to_fv  - handled in a SEPARATE script after WebFetch verification
 *   manual_review  - left alone, only emitted as review CSV
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'

config({ path: '.env.local' })

const COMMIT = process.argv.includes('--commit')

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Row = { id: string; name: string; city: string; current: string; suggested: string }

async function applyLevel(rows: Row[], target: string) {
  let ok = 0, skipped = 0
  for (const r of rows) {
    const { data, error } = await sb.from('places').select('id, vegan_level').eq('id', r.id).maybeSingle()
    if (error || !data) { console.log(`  MISSING ${r.name} (${r.id})`); skipped++; continue }
    if (data.vegan_level !== r.current) {
      console.log(`  SKIP ${r.name}: db has ${data.vegan_level}, CSV expected ${r.current}`)
      skipped++
      continue
    }
    if (data.vegan_level === target) { skipped++; continue }
    if (COMMIT) {
      const { error: e2 } = await sb.from('places').update({ vegan_level: target }).eq('id', r.id)
      if (e2) { console.log(`  ERR ${r.name}: ${e2.message}`); skipped++; continue }
    }
    ok++
  }
  return { ok, skipped }
}

async function main() {
  const data = JSON.parse(readFileSync('scripts/seo-out/belgium-vegan-levels.json', 'utf8'))
  console.log(`Mode: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`)
  console.log()

  console.log(`== ${data.demote_to_vo.length} vegan_friendly -> vegan_options ==`)
  const r1 = await applyLevel(data.demote_to_vo, 'vegan_options')
  console.log(`  applied: ${r1.ok}, skipped: ${r1.skipped}`)

  console.log(`\n== ${data.demote_to_mv.length} vegan_friendly -> mostly_vegan ==`)
  const r2 = await applyLevel(data.demote_to_mv, 'mostly_vegan')
  console.log(`  applied: ${r2.ok}, skipped: ${r2.skipped}`)

  console.log(`\n== ${data.manual_review.length} mostly_vegan rows flagged for manual review ==`)
  console.log('  (no DB write; see scripts/seo-out/belgium-vegan-level-review.csv)')

  console.log(`\nTotal applied: ${r1.ok + r2.ok}`)
}

main().catch(e => { console.error(e); process.exit(1) })
