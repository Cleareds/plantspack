// Bulk-downgrade German FV records that look like OSM misimports (diet:vegan=only
// tag misapplied). Conservative: keeps records named with explicit vegan signal
// (Vegan / Plant / Rein / Veg- / Pflanzlich) at fully_vegan for manual review,
// downgrades the rest to vegan_friendly.
//
// Tradeoff per CLAUDE.md honesty rule: a regular Eiscafé / Döner / Bäckerei
// incorrectly tagged fully_vegan poisons the FV count. Honest understatement
// (vegan_friendly) beats inflated claims that get caught.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'germany-bulk-downgrade-2026-05-19'

function parseCsv(text) {
  const rows = []; let row = []; let cur = ''; let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i+1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c }
    else { if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = '' } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' } else if (c === '\r') {} else cur += c }
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  return rows
}

const csv = fs.readFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/GSC/19.05/germany_100_percent_vegan_enhancement_queue.csv', 'utf8')
const rows = parseCsv(csv); const hdr = rows[0]
const data = rows.slice(1).filter(r => r.length === hdr.length).map(r => Object.fromEntries(hdr.map((h, i) => [h, r[i]])))
const p0Verify = data.filter(d => d.priority === 'P0' && d.action?.includes('Verify 100% vegan claim'))

// Vegan-positive signal: explicit "vegan" word in name (case-insensitive)
const VEGAN_SIGNAL = /\b(vegan|plant[\s-]?based|pflanzlich|rein\s+vegan|veggie|plant\s+power)\b/i
// Likely-non-vegan business patterns
const RISKY_NAME = /\b(eis|eisdiele|eiscaf[eé]|eiscafe|gelato|gelateria|ice\s*cream|keba[bp]|kebabhaus|d[öo]ner|imbiss|grill|grillhaus|b[aä]ckerei|backstube|backwerk|backerei|konditorei|pizza\s*hut|domino|burger\s*king|mcdonald|subway|kfc|nordsee|burgermeister|drogerie|dm|rewe(?!\s+voll)|edeka|lidl|aldi|kaufland|netto|penny|sushi\s*circle|wagamama|hallo\s*pizza|smiley'?s|cafe\s*einstein|tchibo|starbucks)\b/i

// Categorize each P0 verify row
const downgrade = []
const keep_for_review = []
for (const r of p0Verify) {
  const n = r.name || ''
  if (VEGAN_SIGNAL.test(n)) { keep_for_review.push(r); continue }
  if (RISKY_NAME.test(n)) { downgrade.push(r); continue }
  keep_for_review.push(r)
}
console.log(`P0 verify total: ${p0Verify.length}`)
console.log(`  Bulk downgrade (risky non-vegan name patterns): ${downgrade.length}`)
console.log(`  Keep for individual review: ${keep_for_review.length}`)

// Apply downgrade in chunks
const ids = downgrade.map(d => d.plants_pack_id).filter(Boolean)
console.log(`\nApplying downgrade to ${ids.length} rows (chunks of 50)...`)
let ok = 0, fail = 0
for (let i = 0; i < ids.length; i += 50) {
  const chunk = ids.slice(i, i + 50)
  const { error, count } = await sb.from('places').update({
    vegan_level: 'vegan_friendly',
    verification_method: TAG,
    last_verified_at: NOW,
  }).in('id', chunk).select('id', { count: 'exact', head: true })
  if (error) { fail += chunk.length; console.log('  ✗', error.message) }
  else { ok += chunk.length; process.stdout.write('.') }
}
console.log(`\n  ${ok} downgraded, ${fail} failed`)

// Persist the keep-for-review list for the next pass
fs.writeFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/GSC/19.05/germany_p0_keep_for_review.json',
  JSON.stringify(keep_for_review.map(r => ({ id: r.plants_pack_id, slug: r.plants_pack_slug, name: r.name, city: r.city, website: r.current_website, address: r.current_address })), null, 2))
console.log(`\nWrote ${keep_for_review.length} rows to germany_p0_keep_for_review.json for next pass`)
