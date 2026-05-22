import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function parseCsv(text) {
  const rows = []; let row = []; let cur = ''; let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') q = false
      else cur += c
    } else {
      if (c === '"') q = true
      else if (c === ',') { row.push(cur); cur = '' }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
      else if (c === '\r') {}
      else cur += c
    }
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  return rows
}

const text = fs.readFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/summer/croatia_100_percent_vegan_fix_queue.csv', 'utf8')
const rows = parseCsv(text)
const hdr = rows[0]
const data = rows.slice(1).filter(r => r.length === hdr.length).map(r => Object.fromEntries(hdr.map((h, i) => [h, r[i]])))

const NOW = new Date().toISOString()
const REASON_TAG = 'croatia-fix-queue-2026-05-17'

const log = []
function l(s) { console.log(s); log.push(s) }

// Helper: archive (soft) — sets archived_at + archived_reason
async function archive(id, reason) {
  const { error } = await sb.from('places').update({ archived_at: NOW, archived_reason: `${REASON_TAG}: ${reason}` }).eq('id', id)
  return { error }
}
async function downgrade(id, to, reason) {
  const { error } = await sb.from('places').update({ vegan_level: to, verification_method: REASON_TAG, last_verified_at: NOW }).eq('id', id)
  return { error, reason }
}
async function upgrade(id, to, reason) {
  const { error } = await sb.from('places').update({ vegan_level: to, verification_method: REASON_TAG, last_verified_at: NOW }).eq('id', id)
  return { error, reason }
}

const dryRun = process.argv.includes('--dry-run')
if (dryRun) l('[DRY RUN] No DB writes will be performed.\n')

// 1) REMOVE_CLOSED — soft-archive
l('=== REMOVE_CLOSED (soft-archive) ===')
for (const d of data.filter(d => d.action_type === 'REMOVE_CLOSED')) {
  l(`  ${d.current_id}  ${d.name} (${d.city})`)
  if (!dryRun) {
    const r = await archive(d.current_id, 'reported closed in fix queue')
    if (r.error) l('    ✗ ' + r.error.message); else l('    ✓ archived')
  }
}

// 2) DOWNGRADE_MEAT_HEAVY_NOISE — downgrade fully_vegan -> vegan_friendly (these are not actually 100% vegan)
l('\n=== DOWNGRADE_MEAT_HEAVY_NOISE (fully_vegan → vegan_friendly) ===')
for (const d of data.filter(d => d.action_type === 'DOWNGRADE_MEAT_HEAVY_NOISE')) {
  l(`  ${d.current_id}  ${d.name} (${d.city}) — ${d.current_level} → vegan_friendly`)
  if (!dryRun) {
    const r = await downgrade(d.current_id, 'vegan_friendly', 'not actually 100% vegan per fix queue audit')
    if (r.error) l('    ✗ ' + r.error.message); else l('    ✓ downgraded')
  }
}

// 3) REMOVE_OR_ARCHIVE_FALSE_100 — these are not 100% vegan; downgrade to vegan_friendly (preserve record)
l('\n=== REMOVE_OR_ARCHIVE_FALSE_100 (downgrade) ===')
for (const d of data.filter(d => d.action_type === 'REMOVE_OR_ARCHIVE_FALSE_100')) {
  l(`  ${d.current_id}  ${d.name} (${d.city}) — ${d.current_level} → vegan_friendly`)
  if (!dryRun) {
    const r = await downgrade(d.current_id, 'vegan_friendly', 'false 100% vegan claim per fix queue audit')
    if (r.error) l('    ✗ ' + r.error.message); else l('    ✓ downgraded')
  }
}

// 4) MERGE — group by city for these dup pairs (names may vary)
l('\n=== MERGE_DUPLICATE / MERGE_DUPLICATE_AND_VERIFY_SEASONAL / MERGE_OR_RENAME ===')
const mergeRows = data.filter(d => ['MERGE_DUPLICATE', 'MERGE_DUPLICATE_AND_VERIFY_SEASONAL', 'MERGE_OR_RENAME_WITH_VEGE_FINO'].includes(d.action_type))
// Group by city
const mergeGroups = {}
for (const d of mergeRows) {
  const k = d.city.toLowerCase().trim()
  if (!mergeGroups[k]) mergeGroups[k] = []
  mergeGroups[k].push(d)
}

// Special case: Vege&dobro merges INTO existing Vege Fino Za Sve (which is a KEEP_ENRICH_100 row, not in mergeRows)
const vegeFinoRow = data.find(d => /vege\s*fino/i.test(d.name))
if (vegeFinoRow) {
  const vegeAndDobro = mergeRows.find(d => /vege.*dobro/i.test(d.name))
  if (vegeAndDobro) {
    mergeGroups[vegeAndDobro.city.toLowerCase().trim() + '__vege'] = [
      { ...vegeAndDobro, _archive: true },
      { current_id: vegeFinoRow.current_id, current_slug: vegeFinoRow.current_slug, city: vegeFinoRow.city, _keep: true },
    ]
    // Remove the standalone Vege&dobro group
    delete mergeGroups['zagreb']
  }
}

for (const [k, group] of Object.entries(mergeGroups)) {
  if (group.length < 2) {
    l(`  (singleton in merge bucket — leaving)  ${group[0].name} [${group[0].current_id}]`)
    continue
  }
  const explicitArchive = group.find(g => g._archive)
  const explicitKeep = group.find(g => g._keep)
  let keep, drop
  if (explicitArchive && explicitKeep) {
    keep = { id: explicitKeep.current_id, slug: explicitKeep.current_slug }
    drop = [{ id: explicitArchive.current_id, slug: explicitArchive.current_slug }]
    l(`  EXPLICIT: keep ${keep.slug} (${keep.id}), archive ${drop[0].slug}`)
  } else {
    const ids = group.map(g => g.current_id)
    const { data: rows } = await sb.from('places').select('id,slug,name,address,phone,website,opening_hours,main_image_url,latitude,longitude').in('id', ids)
    function score(r) {
      return ['address', 'phone', 'website', 'opening_hours', 'main_image_url', 'latitude'].reduce((s, f) => s + (r[f] ? 1 : 0), 0)
    }
    const ranked = rows.sort((a, b) => score(b) - score(a))
    keep = ranked[0]
    drop = ranked.slice(1)
    l(`  KEEP: ${keep.slug} (${keep.id}) — score=${score(keep)}`)
  }
  for (const d of drop) {
    l(`  ARCHIVE: ${d.slug} (${d.id})`)
    if (!dryRun) {
      const r = await archive(d.id, `duplicate of ${keep.slug}`)
      if (r.error) l('    ✗ ' + r.error.message); else l('    ✓ archived')
    }
  }
}

// 5) UPGRADE_TO_100_IF_OPEN — only upgrade if currently below FV; we can't verify open status without WebSearch, so flag
l('\n=== UPGRADE_TO_100_IF_OPEN (flag for review, no auto-upgrade) ===')
for (const d of data.filter(d => d.action_type === 'UPGRADE_TO_100_IF_OPEN')) {
  l(`  ${d.current_id}  ${d.name} (${d.city}) — ${d.current_level} (needs live verification before upgrade)`)
}

// 6) DO_NOT_UPGRADE_TO_100 — leave alone (these were potential upgrades that the audit rejected)
l('\n=== DO_NOT_UPGRADE_TO_100 (noted, no action) ===')
for (const d of data.filter(d => d.action_type === 'DO_NOT_UPGRADE_TO_100')) {
  l(`  ${d.current_id}  ${d.name} (${d.city}) — keep at ${d.current_level}`)
}

// 7) REVIEW_NOT_RESTAURANT / SEPARATE_EXPERIENCE_FROM_RESTAURANTS — flag
l('\n=== REVIEW_NOT_RESTAURANT / SEPARATE_EXPERIENCE ===')
for (const d of data.filter(d => d.action_type === 'REVIEW_NOT_RESTAURANT' || d.action_type === 'SEPARATE_EXPERIENCE_FROM_RESTAURANTS')) {
  l(`  ${d.current_id}  ${d.name} (${d.city}) — ${d.action_type}: ${d.action_for_agent}`)
}

// 8) VERIFY_* and KEEP_ENRICH_100 — these need live WebSearch, list them out
l('\n=== Items requiring WebSearch verification (next phase) ===')
for (const d of data.filter(d => ['VERIFY_SEASONAL_100', 'KEEP_ENRICH_100', 'ENRICH_AND_VERIFY_CHAIN_BRANCH', 'VERIFY_OLD_OR_STALE_100', 'VERIFY_POTENTIAL_100_OR_MOSTLY'].includes(d.action_type))) {
  l(`  ${d.action_type} | ${d.name} (${d.city}) | ${d.current_id}`)
}

// 9) ADD_MISSING_SOURCE_CANDIDATE — list (handle separately with add-place)
l('\n=== ADD_MISSING_SOURCE_CANDIDATE (separate add-place pass) ===')
for (const d of data.filter(d => d.action_type === 'ADD_MISSING_SOURCE_CANDIDATE')) {
  l(`  ${d.name} (${d.city}) | source: ${d.official_source_to_scrape || d.happycow_or_secondary_source}`)
}

fs.writeFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/summer/croatia_fix_queue_run.log', log.join('\n'))
l('\nLog written to summer/croatia_fix_queue_run.log')
