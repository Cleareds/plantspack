// Smarter rescue: bring back FV records whose web-pass downgrade was too
// aggressive. Rule:
//
//   Keep at fully_vegan if ANY of:
//     - description explicitly declares 100% vegan / rein vegan / etc.
//     - has OSM source_id (community-tagged diet:vegan=only)
//     - verification_level >= 4
//     - name has vegan-suffix or known-vegan-chain word
//
//   AND no clear animal-product evidence found in earlier scrape.
//
// "No website" is no longer auto-downgrade — many real vegan venues
// (food trucks, market stalls, small bakeries) have no website.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'germany-fv-rescue-pass2-2026-05-19'

// Load earlier verify log so we know which had animal-product evidence
const verifyLog = JSON.parse(fs.readFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/GSC/19.05/germany_fv_verify_results.json'))
const animalProductIds = new Set(verifyLog.details.filter(d => d.reason === 'animal product keywords found').map(d => d.id))
console.log(`Excluding ${animalProductIds.size} records with animal-product evidence — those stay downgraded.`)

const { data: candidates } = await sb.from('places').select('id,slug,name,city,website,description,verification_level,source,source_id')
  .eq('country','Germany').eq('verification_method','germany-fv-verify-2026-05-19').eq('vegan_level','vegan_friendly')
console.log(`Pool to consider for rescue: ${candidates?.length}`)

const VEGAN_DESC = /\b(100\s*%?\s*vegan|fully\s+vegan|rein\s+vegan|komplett\s+vegan|nur\s+vegan|exclusively\s+vegan|all\s+vegan|completely\s+vegan|alles?\s+(?:ist\s+)?vegan|veganes?\s+restaurant|veganes?\s+caf[eé]|vegan\s+bakery|plant-based\s+only)\b/i
const NAME_VEGAN = /\b(vegan|vegano|vegana|veganer|veganes|pflanzlich|plant-?based|seitan|katzentempel|brammibal|vedang|veganz|frea|oukan|vincent\s*vegan)\b/i

const rescue = []
for (const r of candidates || []) {
  if (animalProductIds.has(r.id)) continue   // keep downgraded — clear evidence
  const hasOsm = r.source_id?.startsWith('osm-')
  const hasDesc = r.description && VEGAN_DESC.test(r.description)
  const hasName = NAME_VEGAN.test(r.name || '')
  const hasLvl = (r.verification_level || 0) >= 4
  if (hasOsm || hasDesc || hasName || hasLvl) rescue.push(r)
}
console.log(`Rescue candidates (positive signal, no animal evidence): ${rescue.length}`)

let ok = 0
for (let i = 0; i < rescue.length; i += 50) {
  const chunk = rescue.slice(i, i + 50).map(r => r.id)
  const { error } = await sb.from('places').update({
    vegan_level: 'fully_vegan',
    verification_method: TAG,
    last_verified_at: NOW,
  }).in('id', chunk)
  if (!error) { ok += chunk.length; process.stdout.write('.') }
}
console.log(`\n✓ Rescued ${ok}`)

const { count: fv } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('country', 'Germany').eq('vegan_level', 'fully_vegan').is('archived_at', null)
console.log(`\nGermany FV active now: ${fv}`)
