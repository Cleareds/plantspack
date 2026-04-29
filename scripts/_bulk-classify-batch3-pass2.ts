// Second pass: handle the 185 ambiguous places.

import { readFileSync, appendFileSync } from 'fs'

interface Decision { id: string, name: string, action: string, reason: string }

const lines = readFileSync('/tmp/new228.txt', 'utf8').split('\n').filter(Boolean)
const places = lines.map(l => { const [city, id, ...rest] = l.split('|'); return { city, id, name: rest.join('|') } })

// Already-decided IDs
const done = new Set(readFileSync('reports/tier-d-decisions.jsonl', 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).id))
const todo = places.filter(p => !done.has(p.id))
console.log(`Already decided: ${places.length - todo.length}, remaining: ${todo.length}`)

// Vietnamese Chay = vegetarian/Buddhist (often vegan in practice but not strictly)
const VIETNAMESE_CHAY = /\bchay\b|\bchạy\b/i

// Indian vegetarian patterns (Hindu veg = no meat/egg but uses dairy/ghee)
const INDIAN_VEG = [
  /^udupi/i, /\bsagar\b/i, /\bdhaba\b/i, /\bkhanavali\b/i, /\bvihar\b/i,
  /\bupahar/i, /\bbhojanal/i, /\bbhimas\b/i, /\btindi\b/i, /\bkachori\b/i,
  /\bdarshini\b/i, /\bcafe.* hub/i, /^pai vihar/i, /^sri /i, /^shri /i,
  /\bhotel\b/i, /^pranav/i, /^kota /i, /^laxmi /i, /^lakshmi /i,
  /^red fort/i, /^punjabi/i, /\bswadisth\b/i, /^slv\b/i, /\bbasaveshwar/i,
  /\bmadurai\b/i, /^upsouth/i, /\bpedha\b/i, /\bsangam\b/i, /\bsukh sagar\b/i,
  /\bvenkatam/i, /^mishra/i, /\bnammura\b/i, /\bogara\b/i, /\bpalm grove\b/i,
  /\braghavendra/i, /\bnamma\b/i, /^mint masala/i, /^vishnu/i, /^lassi /i,
  /^parota/i, /\bganesh\b/i, /\bjuice center/i,
  /^upahara/i, /\bpark\b$/i,
]

// Indian vegan brand
const INDIAN_VEGAN = [/temple of seitan/i, /\biveg/i]

// German bakery / cafe / restaurant non-vegan signals
const GERMAN_NEUTRAL = [
  /b[äa]cker/i, /konditor/i, /patisserie/i, /^cafe/i, /^café/i,
  /\bcafe$/i, /\bcafé$/i, /\bkitchen$/i, /lazy/i, /trattoria/i,
  /metzgerei/i, /worscht/i, /sausage/i, /\bgrill\b/i,
  /^restaurant /i, /restaurant$/i, /asia /i, /thai /i, /^ramen/i,
  /sushi/i, /churros/i, /bambus/i, /banh mi/i, /matcha/i,
  /\bdoner\b/i, /turm$/i, /haus$/i, /heberer/i, /^kamps$/i,
]

// Specific Veganland / vevi → vegan
const GERMAN_VEGAN = [/^veganland/i, /^vevi$/i, /^etisch$/i]

const out: Decision[] = []
let stillAmbig: any[] = []

for (const p of todo) {
  let action = ''
  let reason = ''
  const n = p.name

  if (VIETNAMESE_CHAY.test(n)) {
    action = 'demote_mostly_vegan'
    reason = 'Vietnamese "chay" = Buddhist vegetarian/vegan (often fully vegan in practice but can include eggs/dairy)'
  } else if (INDIAN_VEGAN.some(re => re.test(n))) {
    action = 'keep'
    reason = 'Known vegan Indian brand'
  } else if (INDIAN_VEG.some(re => re.test(n)) && p.city === 'Bengaluru') {
    action = 'demote_mostly_vegan'
    reason = 'Hindu vegetarian Indian restaurant (uses dairy/ghee, not strictly vegan)'
  } else if (GERMAN_VEGAN.some(re => re.test(n))) {
    action = 'keep'
    reason = 'Vegan-named German venue'
  } else if (GERMAN_NEUTRAL.some(re => re.test(n))) {
    action = 'demote_vegan_options'
    reason = 'Standard German bakery/cafe/restaurant pattern'
  } else if (p.city === 'Bengaluru') {
    action = 'demote_mostly_vegan'
    reason = 'Bengaluru fallback: Indian vegetarian restaurants typically use dairy/ghee'
  } else if (p.city === 'Thu Duc') {
    action = 'demote_mostly_vegan'
    reason = 'Thu Duc fallback: Vietnamese vegetarian (chay) tradition typically vegan in practice'
  } else if (p.city.match(/^(Hamburg|Munich|Cologne|Frankfurt|Leipzig)/)) {
    action = 'demote_vegan_options'
    reason = 'German city fallback: generic non-vegan-named restaurant'
  } else {
    stillAmbig.push(p)
    continue
  }
  out.push({ id: p.id, name: p.name, action, reason })
}

const counts = out.reduce((acc: any, d) => { acc[d.action] = (acc[d.action] ?? 0) + 1; return acc }, {})
console.log('Pass 2 classification:')
console.log(counts)
console.log(`Still ambiguous: ${stillAmbig.length}`)
for (const a of stillAmbig) console.log(`  ${a.city}  ${a.name}`)

for (const d of out) appendFileSync('reports/tier-d-decisions.jsonl', JSON.stringify(d) + '\n')
console.log(`\nAppended ${out.length} decisions`)
