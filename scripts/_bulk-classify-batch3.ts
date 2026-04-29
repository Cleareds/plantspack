// Programmatic name-based classifier for Tier D batch 3 (Hamburg, Leipzig, Munich,
// Cologne, Frankfurt, Thu Duc, Bengaluru). Re-uses every pattern we learned in
// London + Berlin + Asian batches.
//
// Outputs JSONL decisions to reports/tier-d-decisions.jsonl

import { readFileSync, appendFileSync } from 'fs'

const KEEP = [
  /\bvegan\b/i, /\bvegana\b/i, /\bvegano\b/i, /\bplant[- ]?based\b/i,
  /\bpflanzlich\b/i, /\bplnt\b/i, /\bvegane\b/i,
  /loving hut/i, /vincent/i, /\bbeza\b/i, /\bsfera\b/i,
  /\bçiğköftem?$/i, /^çiğkö/i,
  /^\s*vegan\s*$/i,
]

// Definitive non-vegan: animal-product name. Archive these (clearly mistagged).
const ARCHIVE_ANIMAL = [
  /\bhähnchen/i, /\blever/i, /\bleberkäs/i, /\bfleisch(?!erei vegan)/i,
  /metzgerei/i, /steakhaus/i, /seafood/i, /^nordsee$/i,
]

// Generic non-restaurant signals
const ARCHIVE_NOT_RESTAURANT = [
  /^penny$/i, /^aldi$/i, /^lidl$/i, /^rewe$/i, /^edeka$/i,
  /opticians?$/i, /hair & beauty/i, /servicestore/i, /h[aä]agen[- ]?dazs/i,
  /\bpharmacy\b/i,
]

// Demote to vegan_options: clear non-vegan-name patterns
const DEMOTE_VOPT = [
  /döner/i, /kebap/i, /kebab/i, /schawarma/i, /shawarma/i,
  /eis(?!\s|$)|^eis\b/i, /gelato/i, /gelat[ie]ria/i, /eismanufaktur/i, /eiscafe/i, /eispatisserie/i, /eispiraten/i, /eisbande/i, /eisige/i, /eispalast/i,
  /pizza/i, /pizzeria/i, /\bsushi\b/i, /noodle/i,
  /burger/i, /pommes/i, /frittenwerk/i, /chicken/i, /grillo$/i,
  /asia (imbiss|food|gourmet|box)/i, /china (king|garden)/i, /japan/i,
  /\bindia\b|^indian /i, /^thai\b/i,
  /currywurst/i, /imbiss/i, /\bgrill\b/i,
  /lounge$/i, /^the .* lounge$/i,
  /^cafe?\b|cafeter/i, /coffee/i, /pastel/i, /bakery/i, /bakerei/i,
  /^restaurant$/i, /bistro$/i, /\bbistro\b/i,
  /falafel/i, /^buns\b/i, /^pho /i, /pho$/i, /^vietnam/i, /saigon/i,
]

interface Place { city: string, id: string, name: string }
const lines = readFileSync('/tmp/new228.txt', 'utf8').split('\n').filter(Boolean)
const places: Place[] = lines.map(l => { const [city, id, ...rest] = l.split('|'); return { city, id, name: rest.join('|') } })

const decisions: any[] = []
let ambig = 0
for (const p of places) {
  let action = ''
  let reason = ''
  if (KEEP.some(re => re.test(p.name))) { action = 'keep'; reason = 'Name explicitly indicates vegan' }
  else if (ARCHIVE_ANIMAL.some(re => re.test(p.name))) { action = 'archive'; reason = 'Name contains animal-product reference (chicken/liver loaf/butcher etc.)' }
  else if (ARCHIVE_NOT_RESTAURANT.some(re => re.test(p.name))) { action = 'archive'; reason = 'Not a restaurant (supermarket/optician/etc.)' }
  else if (DEMOTE_VOPT.some(re => re.test(p.name))) { action = 'demote_vegan_options'; reason = 'Name pattern matches non-vegan category (kebab/eis/pizza/sushi/burger/cafe/etc.)' }
  else { action = 'AMBIGUOUS'; ambig++ }
  decisions.push({ id: p.id, name: p.name, city: p.city, action, reason })
}
const counts = decisions.reduce((acc: any, d) => { acc[d.action] = (acc[d.action] ?? 0) + 1; return acc }, {})
console.log('Auto-classification:')
console.log(counts)
console.log(`\nAmbiguous (need search): ${ambig}`)
console.log('---')
for (const d of decisions.filter(d => d.action === 'AMBIGUOUS')) {
  console.log(`  ${d.city}  ${d.name}  [${d.id}]`)
}

// Write only non-ambiguous decisions to JSONL
let appended = 0
for (const d of decisions) {
  if (d.action === 'AMBIGUOUS') continue
  appendFileSync('reports/tier-d-decisions.jsonl', JSON.stringify(d) + '\n')
  appended++
}
console.log(`\nAppended ${appended} non-ambiguous decisions to reports/tier-d-decisions.jsonl`)
