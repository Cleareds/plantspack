// Pass 3: aggressive downgrade. Anything without a clear vegan signal in
// the name goes to vegan_friendly. Per CLAUDE.md "Honest understatement
// beats inflated claims that get caught" — false-positive FV records are
// trust-killers. A small handful of legit vegan venues (FREA, Balaram)
// may need manual re-upgrade afterwards; that's tracked in the rescue list.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'germany-bulk-downgrade-pass3-2026-05-19'

const review = JSON.parse(fs.readFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/GSC/19.05/germany_p0_keep_for_review.json'))

const VEGAN_SIGNAL = /\b(vegan|plant[\s-]?based|pflanzlich|rein\s+vegan|veggie|plant\s+power|veg-|veg\.|seitan)\b/i

// Known vegan venues to rescue from the aggressive downgrade. These got
// caught because their names don't contain "vegan" but they ARE 100% vegan.
const RESCUE_SLUGS = new Set([
  // FREA — Berlin zero-waste vegan flagship
  // Balaram — Berlin Friedrichshain vegan ice cream
  // (Identified via existing PlantsPack imports + my session knowledge)
])
const RESCUE_NAME_MATCH = /^(frea|balaram|garden gourmet)/i

const toDowngrade = []
const kept = []
for (const r of review) {
  if (VEGAN_SIGNAL.test(r.name || '')) { kept.push(r); continue }
  if (RESCUE_NAME_MATCH.test(r.name || '')) { kept.push(r); continue }
  toDowngrade.push(r)
}
console.log(`Pass 3: ${toDowngrade.length} downgrade, ${kept.length} kept (vegan-signal in name or rescued)`)

const ids = toDowngrade.map(d => d.id).filter(Boolean)
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

console.log(`\nKept at fully_vegan (manual confirm later):`)
for (const r of kept) console.log(`  ${r.name.padEnd(40)} | ${r.city.padEnd(20)} | ${r.slug}`)

fs.writeFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/GSC/19.05/germany_p0_kept_fv.json', JSON.stringify(kept, null, 2))
