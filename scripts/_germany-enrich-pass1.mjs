// P1 "Enrich and externally verify" handling.
// 1. Pattern-downgrade rows whose name lacks a vegan signal AND looks like
//    a generic non-vegan business (same heuristic as the P0 bulk passes).
// 2. For the rest with a real official_source_to_scrape URL, WebFetch and
//    enrich phone/hours/website.
//
// This script does ONLY step 1 (the downgrade pass). Step 2 runs in a
// follow-up script with WebFetch batches.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'germany-p1-bulk-downgrade-2026-05-19'

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
const enrich = data.filter(d => d.action?.includes('Enrich and externally verify'))

const VEGAN_SIGNAL = /\b(vegan|plant[\s-]?based|pflanzlich|rein\s+vegan|veggie|plant\s+power|veg-|veg\.|seitan)\b/i
const RISKY = /\b(eis[a-zäöüß]*|gelaterie|gelato|gelateria|cuore\s+di\s+vetro|fisch[a-zäöüß]*|fleisch(?!erei)|metzgerei|wurst[a-zäöüß]*|grill[a-zäöüß]*|hähnchen|huhn|geflügel|schnitzel|caf[ée]\s+sahne|sahnecaf[ée]|cream\s+eis|softice|burger\s*me|burgerme|fr[äa]ulein\s+frost|berliner\s+eisb[äa]r|coccola|coco\s+beach|fischladen|keba[bp]|kebabhaus|d[öo]ner|imbiss|b[aä]ckerei|backstube|backwerk|konditorei|burger\s*hear|burgerheart|poke|sushi(?!\s*vegan)|asia\s+wok|ramen(?!\s*vegan)|izakaya(?!\s*vegan)|metzger|wurst|grill\s*haus|barbecue|bbq|steak)\b/i

const toDowngrade = []
const toEnrich = []
for (const r of enrich) {
  const n = r.name || ''
  if (VEGAN_SIGNAL.test(n)) { toEnrich.push(r); continue }
  if (RISKY.test(n)) { toDowngrade.push(r); continue }
  toEnrich.push(r)
}
console.log(`P1 enrich pool: ${enrich.length}`)
console.log(`  → downgrade (risky name, no vegan signal): ${toDowngrade.length}`)
console.log(`  → enrich (vegan signal or neutral name): ${toEnrich.length}`)

const ids = toDowngrade.map(d => d.plants_pack_id).filter(Boolean)
let ok = 0
for (let i = 0; i < ids.length; i += 50) {
  const chunk = ids.slice(i, i + 50)
  const { error } = await sb.from('places').update({
    vegan_level: 'vegan_friendly',
    verification_method: TAG,
    last_verified_at: NOW,
  }).in('id', chunk)
  if (!error) { ok += chunk.length; process.stdout.write('.') }
}
console.log(`\n  ${ok} downgraded`)
fs.writeFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/GSC/19.05/germany_p1_to_enrich.json',
  JSON.stringify(toEnrich.map(r => ({ id: r.plants_pack_id, slug: r.plants_pack_slug, name: r.name, city: r.city, official_url: r.official_source_to_scrape, current_website: r.current_website })), null, 2))
console.log(`\nWrote ${toEnrich.length} rows to germany_p1_to_enrich.json for the WebFetch pass`)
