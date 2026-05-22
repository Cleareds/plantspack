// Bulk-promote Germany FV places to verification_level=3 (Admin-reviewed)
// when they carry a positive trust signal:
//   - OSM source_id (community-tagged diet:vegan=only)
//   - Name contains vegan word
//   - Description declares 100% vegan / rein vegan / etc
//   - Already confirmed via recent verification_method audit
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'germany-verification-bump-2026-05-19'

const all = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('id,slug,name,description,source_id,verification_level,verification_method')
    .eq('country','Germany').eq('vegan_level','fully_vegan').is('archived_at',null).lt('verification_level',3).range(from,from+999)
  if (!data?.length) break
  all.push(...data); if (data.length<1000) break; from+=1000
}
console.log(`Pool (FV with verification_level < 3): ${all.length}`)

const VEGAN_NAME = /\b(vegan|vegano|vegana|veganer|veganes|pflanzlich|plant-?based|seitan|katzentempel|brammibal|vedang|veganz|frea|oukan|vincent\s*vegan|bonvivant|li\.ke|liike|swing\s*kitchen|cigkoftem|loving\s*hut|veganland|veganatural|cig\s*kofte)\b/i
const VEGAN_DESC = /\b(100\s*%?\s*vegan|fully\s+vegan|rein\s+vegan|komplett\s+vegan|exclusively\s+vegan|all\s+vegan|completely\s+vegan|veganes?\s+restaurant|veganes?\s+caf[eé]|veganes?\s+bistro|vegan\s+bakery|plant-based\s+only|purely\s+vegan|all\s+plant-based|rein\s+pflanzlich)\b/i
const RECENT_AUDIT = /^(berlin-fv-websearch|germany-fv-rescue|germany-midtier|germany-osm-gap|germany-dus-cgn|germany-smalltowns|germany-rhein-ruhr|germany-osm-retry|berlin-fv-verify)/

const promote = []
for (const r of all) {
  const hasOsm = (r.source_id||'').startsWith('osm-')
  const hasName = VEGAN_NAME.test(r.name||'')
  const hasDesc = r.description && VEGAN_DESC.test(r.description)
  const recentAudit = r.verification_method && RECENT_AUDIT.test(r.verification_method)
  if (hasOsm || hasName || hasDesc || recentAudit) promote.push({ id: r.id, slug: r.slug, why: [hasOsm&&'osm',hasName&&'name',hasDesc&&'desc',recentAudit&&'audit'].filter(Boolean).join('+') })
}
console.log(`To promote to L3: ${promote.length}`)
const whyCounts = {}
for (const p of promote) whyCounts[p.why] = (whyCounts[p.why]||0)+1
for (const [why,n] of Object.entries(whyCounts).sort((a,b)=>b[1]-a[1])) console.log(`  ${why.padEnd(20)} ${n}`)

let ok = 0
for (let i = 0; i < promote.length; i += 50) {
  const chunk = promote.slice(i, i+50).map(p => p.id)
  const { error } = await sb.from('places').update({
    verification_level: 3,
    verification_method: TAG,
    last_verified_at: NOW,
    is_verified: true,
  }).in('id', chunk)
  if (!error) { ok += chunk.length; process.stdout.write('.') }
}
console.log(`\n✓ Promoted ${ok} to verification_level=3`)
