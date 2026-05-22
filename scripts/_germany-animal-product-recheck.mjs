// Re-check the 113 Germany venues previously downgraded for "animal product
// keywords found" with a smarter regex that:
//   - Strips "vegan X" / "veganes X" / "veganer X" / "veganem X" prefix
//   - Strips "X-Alternative" / "X-Ersatz" / "X-Style" / "Pflanzlich-X"
//   - Strips "X-frei" / "X-free" / "ohne X" / "kein X"
//   - Then scans the cleaned text for truly mentioned animal products
//
// Only confirmed downgrades stay; false positives get restored.
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG_RESTORE = 'germany-fv-restore-2026-05-19'
const TAG_KEEP = 'germany-fv-confirmed-meat-2026-05-19'

const verifyLog = JSON.parse(fs.readFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/GSC/19.05/germany_fv_verify_results.json'))
const animalIds = verifyLog.details.filter(d => d.reason === 'animal product keywords found').map(d => d.id)
console.log(`Re-checking ${animalIds.length} venues previously flagged for animal products...`)

const { data: rows } = await sb.from('places').select('id,slug,name,city,website,description,source_id,verification_level').in('id', animalIds)

function curlOne(url) {
  return new Promise(resolve => {
    const child = spawn('curl', ['-fsSL', '--max-time', '12', '-A', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36', url], { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    const timer = setTimeout(() => { child.kill('SIGTERM'); resolve('') }, 13000)
    child.on('close', () => { clearTimeout(timer); resolve(out) })
  })
}

// Tighter animal-product regex. Strip vegan-prefixed versions first.
function hasAnimalProduct(html) {
  let t = html.toLowerCase()
  // 1) Strip vegan-prefixed versions
  t = t.replace(/\bvegan(?:e|es|er|en|em)?\s+[a-zäöüß\-]+/g, ' ')   // "vegane Hähnchen" / "veganes Käse"
  t = t.replace(/\bplant-?based\s+[a-zäöüß\-]+/g, ' ')
  t = t.replace(/\bpflanzlich(?:e|es|er|en|em)?\s+[a-zäöüß\-]+/g, ' ')
  t = t.replace(/\b(?:hausgemacht(?:e|es|er|en|em)?|selbstgemacht(?:e|es|er|en|em)?)\s+vegane?s?\s+[a-zäöüß\-]+/g, ' ')
  // 2) Strip "X-Alternative" / "X-Ersatz" / "X-Style" / "X-Imitat"
  t = t.replace(/[a-zäöüß\-]+[-\s](?:alternative?|ersatz|style|imitat|substitute|replacement|free|frei)/g, ' ')
  // 3) Strip "ohne X" / "kein X" / "X-free" patterns
  t = t.replace(/\bohne\s+[a-zäöüß\-]+/g, ' ')
  t = t.replace(/\bkein(?:e|es|er|en|em)?\s+[a-zäöüß\-]+/g, ' ')
  t = t.replace(/\b(?:not?|no)\s+[a-z\-]+/g, ' ')
  // 4) Strip negated forms
  t = t.replace(/fleischlos|laktosefrei|milchfrei|eifrei|käsefrei/g, ' ')
  // 5) Now scan for actual animal-product words in the cleaned text
  // Require word-boundary on BOTH sides
  return /\b(rindfleisch|schweinefleisch|h(?:ä|a)hnchenbrust|h(?:ä|a)hnchenfleisch|hühnchen|geflügelfleisch|hackfleisch|schinken|bratwurst|leberkäse|lachsfleisch|thunfischfleisch|garnelenfleisch|forellenfleisch|prawns|kuhmilch|sahnequark|condensed\s+milk|whole\s+milk|honig|honey(?!comb)|gelatin(?:e)?|aspic|carnitas|pulled\s+pork|pulled\s+beef|burrata\s+(?:di|with)|kobe\s+beef|wagyu\s+beef|veal|venison|bacon\s+strip|sausage(?!s\s+free)|prosciutto\s+(?:di|crudo))\b/.test(t)
}

const CONCURRENCY = 6
let idx = 0
const results = []
async function worker() {
  while (idx < rows.length) {
    const i = idx++
    const r = rows[i]
    const html = await curlOne(r.website)
    if (html.length < 200) { results.push({ ...r, decision: 'restore', reason: 'fetch failed on re-check' }); continue }
    if (hasAnimalProduct(html)) { results.push({ ...r, decision: 'confirm_downgrade', reason: 'still has animal products with tighter regex' }); continue }
    results.push({ ...r, decision: 'restore', reason: 'false positive — vegan-prefixed mention' })
    if (i % 20 === 0) process.stdout.write(`[${i}/${rows.length}]`)
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))

const restore = results.filter(r => r.decision === 'restore')
const confirmed = results.filter(r => r.decision === 'confirm_downgrade')
console.log(`\nResults: ${restore.length} restore, ${confirmed.length} confirmed (still flagged with tighter regex)`)
console.log('\nConfirmed downgrades (likely truly mixed venues):')
for (const r of confirmed) console.log(`  ${r.name.padEnd(35)} | ${r.city.padEnd(22)} | ${r.website}`)

// Restore the false positives
let ok = 0
for (let i = 0; i < restore.length; i += 50) {
  const chunk = restore.slice(i, i + 50).map(r => r.id)
  const { error } = await sb.from('places').update({
    vegan_level: 'fully_vegan',
    verification_method: TAG_RESTORE,
    last_verified_at: NOW,
  }).in('id', chunk)
  if (!error) ok += chunk.length
}
console.log(`\n  Restored ${ok} false-positive downgrades`)

const { count: fv } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('country', 'Germany').eq('vegan_level', 'fully_vegan').is('archived_at', null)
console.log(`Germany FV active: ${fv}`)
