// Second pass: catch German compound words that started with "Eis" but
// weren't caught by the first regex (Eiskimo, Eishaus, Eislabor,
// Eismanufaktur, Eisfee, Eisboutique, Eisbär), plus Fisch* (fish), Italian
// ice cream brand patterns (Gelaterie, Cuore Di Vetro), and a few extras.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'germany-bulk-downgrade-pass2-2026-05-19'

const review = JSON.parse(fs.readFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/GSC/19.05/germany_p0_keep_for_review.json'))

const VEGAN_SIGNAL = /\b(vegan|plant[\s-]?based|pflanzlich|rein\s+vegan|veggie|plant\s+power)\b/i
// Wider name patterns: German compound starting with Eis-, ice cream brands,
// fish/meat words, generic café names.
const RISKY = /\b(eis[a-zäöüß]*|gelaterie|gelato|gelateria|cuore\s+di\s+vetro|fisch[a-zäöüß]*|fleisch[a-zäöüß]*|metzgerei|fleischerei|wurst[a-zäöüß]*|grill[a-zäöüß]*|hähnchen|huhn|geflügel|schnitzel|caf[ée]\s+sahne|sahnecaf[ée]|altstadt|kaffeeklatsch|cream\s+eis|softice|burger\s*me|burgerme|fr[äa]ulein\s+frost|berliner\s+eisb[äa]r|coccola|coco\s+beach|fischladen)\b/i

const toDowngrade = []
const stillReview = []
for (const r of review) {
  if (VEGAN_SIGNAL.test(r.name || '')) { stillReview.push(r); continue }
  if (RISKY.test(r.name || '')) { toDowngrade.push(r); continue }
  stillReview.push(r)
}
console.log(`Pass 2: ${toDowngrade.length} downgrade, ${stillReview.length} still for review`)

const ids = toDowngrade.map(d => d.id).filter(Boolean)
let ok = 0, fail = 0
for (let i = 0; i < ids.length; i += 50) {
  const chunk = ids.slice(i, i + 50)
  const { error } = await sb.from('places').update({
    vegan_level: 'vegan_friendly',
    verification_method: TAG,
    last_verified_at: NOW,
  }).in('id', chunk)
  if (error) { fail += chunk.length } else { ok += chunk.length; process.stdout.write('.') }
}
console.log(`\n  ${ok} downgraded, ${fail} failed`)

fs.writeFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/GSC/19.05/germany_p0_keep_for_review.json',
  JSON.stringify(stillReview, null, 2))
console.log(`\n${stillReview.length} rows still pending individual review`)
console.log('Names still pending:')
for (const r of stillReview.slice(0,40)) console.log(`  ${r.name.padEnd(40)} | ${r.city.padEnd(20)} | website=${r.website ? 'Y' : 'N'}`)
EOF
EOF