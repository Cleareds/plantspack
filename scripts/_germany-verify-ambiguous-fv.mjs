// Parallel-curl every ambiguous non-Berlin FV Germany venue and scan the
// HTML for animal-product keywords. Conservative rules:
//
//   1. If website page mentions any clear animal product (Fleisch/Käse/Milch/
//      Wurst/Hähnchen/cheese/meat/etc.) → downgrade to vegan_friendly.
//   2. If website page mentions a vegan declaration ("100% vegan", "rein
//      vegan", "fully plant-based") → keep at fully_vegan + timestamp.
//   3. If no website OR no signal either way → conservative downgrade.
//
// Same CLAUDE.md honesty rule applies: false-positive FV is a trust killer,
// users can re-upgrade real vegan venues we incorrectly demoted.
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'germany-fv-verify-2026-05-19'

const rows = JSON.parse(fs.readFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/GSC/19.05/germany_ambiguous_fv_to_verify.json'))
console.log(`Verifying ${rows.length} ambiguous non-Berlin FV records...`)

function curlOne(url) {
  return new Promise(resolve => {
    const child = spawn('curl', ['-fsSL', '--max-time', '12', '-A', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36', url], { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    const timer = setTimeout(() => { child.kill('SIGTERM'); resolve('') }, 13000)
    child.on('close', () => { clearTimeout(timer); resolve(out) })
  })
}

// Animal-product keywords. Tuned for German + English menus.
// Avoid false positives: 'fleischlos' (meatless), 'käsefrei' (cheese-free)
// are negated forms — we strip them before scanning.
function hasAnimalProduct(html) {
  // Lowercase + strip negated forms
  let t = html.toLowerCase()
    .replace(/fleischlos|ohne\s+fleisch|kein\s+fleisch|meat-free|meat\s+free|fleischfrei/g, '')
    .replace(/käsefrei|ohne\s+käse|kein\s+käse|cheese-free|cheese\s+free/g, '')
    .replace(/milchfrei|laktosefrei|ohne\s+milch|lactose-free|dairy-free|dairy\s+free|milk-free/g, '')
    .replace(/eifrei|ohne\s+ei|egg-free|egg\s+free|eggless/g, '')
    .replace(/butterfrei|ohne\s+butter|butter-free/g, '')
  // Strong animal-product signals
  const animal = /\b(rindfleisch|schweinefleisch|h(?:ä|a)hnchen(?:fleisch|brust)?|hühnchen|geflügel|hackfleisch|schinken|salami|pepperoni|chorizo|wurst(?:waren|salat)?|bratwurst|currywurst|leberkäse|lachs|thunfisch|garnele|shrimp|krabben|forelle|prawns?|tuna|salmon|trout|beef|pork|chicken|veal|lamb|venison|bacon|ham|sausage|prosciutto|parmigiano|parmesan|mozzarella(?!\s+vegan)|gorgonzola|ricotta(?!\s+vegan)|feta(?!\s+vegan)|cheddar(?!\s+vegan)|gouda|brie|camembert|emmentaler|sahne(?!\s*alternative|\s*ersatz)|crème\s+fraîche|condensed\s+milk|whole\s+milk|butter(?!\s*alternative|\s*ersatz)|honig(?!frei)|honey(?!free)|gelatin(?:e)?|aspic|carnitas|pulled\s+pork|pulled\s+beef|burrata|kobe|wagyu)\b/
  return animal.test(t)
}

function hasVeganDeclaration(html) {
  const t = html.toLowerCase()
  // Strong vegan-only claims
  return /\b(100\s*%?\s*vegan|fully\s+vegan|rein\s+vegan|komplett\s+vegan|nur\s+vegan|all\s+vegan|completely\s+vegan|exclusively\s+vegan|alles?\s+ist\s+vegan|plant[\s-]?based\s+only|veganes?\s+restaurant|veganes?\s+caf[eé]|vegan\s+bakery|vegan(?:e|er|es)\s+(?:k[uü]che|speisekarte|speisen))\b/.test(t)
}

const CONCURRENCY = 8
const results = []
let idx = 0
async function worker() {
  while (idx < rows.length) {
    const i = idx++
    const r = rows[i]
    if (!r.website) { results.push({ ...r, decision: 'downgrade', reason: 'no website' }); continue }
    const html = await curlOne(r.website)
    if (html.length < 200) { results.push({ ...r, decision: 'downgrade', reason: 'fetch failed' }); continue }
    if (hasAnimalProduct(html)) { results.push({ ...r, decision: 'downgrade', reason: 'animal product keywords found' }); continue }
    if (hasVeganDeclaration(html)) { results.push({ ...r, decision: 'keep', reason: 'vegan declaration found' }); continue }
    // No clear signal either way → conservative downgrade
    results.push({ ...r, decision: 'downgrade', reason: 'no vegan declaration on page' })
    if (i % 50 === 0) process.stdout.write(`[${i}/${rows.length}]`)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
console.log(`\nProcessed ${results.length}`)

const downgrade = results.filter(r => r.decision === 'downgrade')
const keep = results.filter(r => r.decision === 'keep')
console.log(`  Downgrade: ${downgrade.length}`)
console.log(`  Keep at FV (vegan declaration on site): ${keep.length}`)

// Apply downgrades
let ok = 0
for (let i = 0; i < downgrade.length; i += 50) {
  const chunk = downgrade.slice(i, i + 50).map(r => r.id)
  const { error } = await sb.from('places').update({
    vegan_level: 'vegan_friendly',
    verification_method: TAG,
    last_verified_at: NOW,
  }).in('id', chunk)
  if (!error) { ok += chunk.length; process.stdout.write('.') }
}
console.log(`\n  Downgraded ${ok}`)

// Stamp the keeps with verification timestamp
let okKeep = 0
for (let i = 0; i < keep.length; i += 50) {
  const chunk = keep.slice(i, i + 50).map(r => r.id)
  const { error } = await sb.from('places').update({ verification_method: TAG, last_verified_at: NOW }).in('id', chunk)
  if (!error) { okKeep += chunk.length }
}
console.log(`  Confirmed FV (timestamp bumped): ${okKeep}`)

fs.writeFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/GSC/19.05/germany_fv_verify_results.json', JSON.stringify({ downgrade: downgrade.length, keep: keep.length, details: results }, null, 2))
console.log(`\nLog written to germany_fv_verify_results.json`)
