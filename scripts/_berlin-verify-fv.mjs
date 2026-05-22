// Verification pass for Berlin's 187 FV. Same corrected rule set as the
// Germany-wide rescue: only downgrade if active animal-product evidence
// on the venue's website. Keep at FV if OSM source, vegan-name signal,
// vegan description, or high verification level.
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'berlin-fv-verify-2026-05-19'

const { data: rows } = await sb.from('places').select('id,slug,name,city,website,description,verification_level,source,source_id').eq('country','Germany').eq('city','Berlin').eq('vegan_level','fully_vegan').is('archived_at',null)
console.log(`Verifying ${rows.length} Berlin FV records...`)

function curlOne(url) {
  return new Promise(resolve => {
    const child = spawn('curl', ['-fsSL', '--max-time', '12', '-A', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36', url], { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    const timer = setTimeout(() => { child.kill('SIGTERM'); resolve('') }, 13000)
    child.on('close', () => { clearTimeout(timer); resolve(out) })
  })
}
function hasAnimalProduct(html) {
  let t = html.toLowerCase()
    .replace(/fleischlos|ohne\s+fleisch|kein\s+fleisch|meat-free|meat\s+free|fleischfrei/g, '')
    .replace(/käsefrei|ohne\s+käse|kein\s+käse|cheese-free/g, '')
    .replace(/milchfrei|laktosefrei|ohne\s+milch|lactose-free|dairy-free|milk-free/g, '')
    .replace(/eifrei|ohne\s+ei|egg-free|eggless/g, '')
    .replace(/butterfrei|ohne\s+butter|butter-free/g, '')
  return /\b(rindfleisch|schweinefleisch|h(?:ä|a)hnchen(?:fleisch|brust)?|hühnchen|geflügel|hackfleisch|schinken|salami|pepperoni|chorizo|wurst(?:waren|salat)?|bratwurst|currywurst|leberkäse|lachs|thunfisch|garnele|forelle|prawns?|tuna|salmon|trout|beef|pork|chicken|veal|lamb|venison|bacon|ham|sausage|prosciutto|parmigiano|parmesan|mozzarella(?!\s+vegan)|gorgonzola|ricotta(?!\s+vegan)|feta(?!\s+vegan)|cheddar(?!\s+vegan)|gouda|brie|camembert|emmentaler|condensed\s+milk|whole\s+milk|honig(?!frei)|honey(?!free)|gelatin(?:e)?|aspic|carnitas|pulled\s+pork|pulled\s+beef|kobe|wagyu)\b/.test(t)
}

const VEGAN_DESC = /\b(100\s*%?\s*vegan|fully\s+vegan|rein\s+vegan|komplett\s+vegan|nur\s+vegan|veganes?\s+restaurant|veganes?\s+caf[eé]|vegan\s+bakery|plant-based\s+only)\b/i
const NAME_VEGAN = /\b(vegan|vegano|vegana|veganer|veganes|pflanzlich|plant-?based|seitan|katzentempel|brammibal|vedang|veganz|frea|oukan|vincent\s*vegan|bonvivant|li\.ke|liike|cookies\s*cream|swing\s*kitchen)\b/i

function hasPositiveSignal(r) {
  return !!(
    (r.source_id?.startsWith('osm-')) ||
    (r.description && VEGAN_DESC.test(r.description)) ||
    NAME_VEGAN.test(r.name || '') ||
    ((r.verification_level || 0) >= 4)
  )
}

const CONCURRENCY = 8
const results = []
let idx = 0
async function worker() {
  while (idx < rows.length) {
    const i = idx++
    const r = rows[i]
    // If positive signal AND no website, skip the curl - keep at FV
    if (hasPositiveSignal(r) && !r.website) { results.push({ ...r, decision: 'keep', reason: 'positive signal, no website to check' }); continue }
    // No website + no signal → conservative keep (changed from earlier aggressive downgrade)
    if (!r.website) { results.push({ ...r, decision: 'keep', reason: 'no website, no signal — keep but flag' }); continue }
    const html = await curlOne(r.website)
    if (html.length < 200) {
      if (hasPositiveSignal(r)) { results.push({ ...r, decision: 'keep', reason: 'fetch failed but has positive signal' }); continue }
      results.push({ ...r, decision: 'keep', reason: 'fetch failed, no other signal — keep but flag' })
      continue
    }
    if (hasAnimalProduct(html)) { results.push({ ...r, decision: 'downgrade', reason: 'animal product keywords on site' }); continue }
    results.push({ ...r, decision: 'keep', reason: 'no animal product evidence' })
    if (i % 25 === 0) process.stdout.write(`[${i}/${rows.length}]`)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

const downgrade = results.filter(r => r.decision === 'downgrade')
const keep = results.filter(r => r.decision === 'keep')
console.log(`\nResults: ${keep.length} keep, ${downgrade.length} downgrade`)
console.log('\nBerlin downgrade candidates (manual review recommended):')
for (const r of downgrade) console.log(`  ${r.name.padEnd(35)} | ${r.website}`)

let ok = 0
for (let i = 0; i < downgrade.length; i += 50) {
  const chunk = downgrade.slice(i, i + 50).map(r => r.id)
  const { error } = await sb.from('places').update({
    vegan_level: 'vegan_friendly',
    verification_method: TAG,
    last_verified_at: NOW,
  }).in('id', chunk)
  if (!error) ok += chunk.length
}
let okKeep = 0
for (let i = 0; i < keep.length; i += 50) {
  const chunk = keep.slice(i, i + 50).map(r => r.id)
  const { error } = await sb.from('places').update({ verification_method: TAG, last_verified_at: NOW }).in('id', chunk)
  if (!error) okKeep += chunk.length
}
console.log(`\n  Downgraded: ${ok} | Confirmed: ${okKeep}`)

fs.writeFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/GSC/19.05/berlin_fv_verify_results.json', JSON.stringify({ details: results }, null, 2))
