// Resolve the 81 held duplicate pairs with IDENTICAL coordinates but different city labels
// ("Hoi An" vs "Hội An Ward", "Gibsons" vs "Gibson"): two OSM import batches of one venue.
// Dry-run by default; --apply writes.
//
//   MERGE  names match by token containment or Jaccard >= 0.5 (never Levenshtein) and same country
//          -> archive the weaker row (slug alias to the winner), set the winner's city to the
//             label most used by live places in that country, report -> reviewed
//   HOLD   names differ, countries differ, or both rows are protected -> note updated, stays pending
// Protected = has reviews, or added by a person (created_by != the import account): never archived.
// Rollback: reports/label-check/rollback-city-pairs-2026-10-15.json
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const TAG = 'city-label-pairs-2026-10-15'
const IMPORT_ACCOUNT = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const STOP = new Set(['the', 'le', 'la', 'el', 'il', 'de', 'het', 'een', 'a', 'an', 'and', 'of', 'restaurant', 'restaurante',
  'ristorante', 'restoran', 'cafe', 'caffe', 'coffee', 'bar', 'bistro', 'kitchen', 'house', 'vegan', 'vegano', 'vegana',
  'vegetarian', 'vegetariano', 'vegetariana', 'vegetarians', 'chay', 'quan', 'nha', 'hang', 'gmbh', 'ltd', 'inc', 'llc', 'co'])
const tokens = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(t => t && !STOP.has(t))
// Containment on ONE shared token is undecidable ("Odette" vs "Odette Bali", "Saigon Cafe" vs
// "District1 SaiGon Cafe"): those go to a human unless the token sets are identical.
function nameMatch(n1, n2) {
  const A = new Set(tokens(n1)), B = new Set(tokens(n2))
  if (!A.size || !B.size) return false
  const shared = [...A].filter(t => B.has(t)).length
  if (A.size === B.size && shared === A.size) return true
  if (shared < 2) return false
  if (shared === Math.min(A.size, B.size)) return true
  return shared / (A.size + B.size - shared) >= 0.5
}
// Country of the shared coordinates, from OSM Nominatim (1 req/s, cached).
const geoCache = {}
async function coordCountry(lat, lon) {
  const k = `${lat},${lon}`
  if (k in geoCache) return geoCache[k]
  await new Promise(r => setTimeout(r, 1100))
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=5&accept-language=en&lat=${lat}&lon=${lon}`,
    { headers: { 'User-Agent': 'PlantsPack data-quality (plantspack.com)' } })
  const j = res.ok ? await res.json() : null
  return (geoCache[k] = j?.address?.country || null)
}
const protectedRow = p => (p.review_count || 0) > 0 || p.created_by !== IMPORT_ACCOUNT
const richness = p => (p.review_count || 0) * 100 + (p.is_verified ? 40 : 0) + (p.verification_level || 0) * 5 +
  (p.website ? 3 : 0) + (p.main_image_url ? 3 : 0) + (p.opening_hours ? 2 : 0) + (p.phone ? 1 : 0) +
  ((p.address || '').length > 10 ? 1 : 0) + (p.description ? 1 : 0)

const { data: reps, error: e1 } = await sb.from('place_reports').select('id,place_id,related_place_id,note')
  .eq('type', 'duplicate').eq('status', 'pending').ilike('note', '%different city labels%').limit(1000)
if (e1) throw e1
const ids = [...new Set(reps.flatMap(r => [r.place_id, r.related_place_id]))]
const P = {}
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await sb.from('places').select('id,name,slug,city,country,address,latitude,longitude,website,phone,main_image_url,opening_hours,description,is_verified,verification_level,review_count,created_by,archived_at,admin_notes,tags').in('id', ids.slice(i, i + 200))
  if (error) throw error
  for (const p of data) P[p.id] = p
}
// City-label popularity per country (live rows). PostgREST caps reads at 1000, so count per label.
const cityCount = {}
async function count(country, city) {
  const k = `${country}|${city}`
  if (!(k in cityCount)) {
    const { count: n, error } = await sb.from('places').select('id', { count: 'exact', head: true })
      .eq('country', country).eq('city', city).is('archived_at', null)
    if (error) throw error
    cityCount[k] = n || 0
  }
  return cityCount[k]
}

const plan = { merge: [], hold: [], already: [] }
for (const r of reps) {
  const a = P[r.place_id], b = P[r.related_place_id]
  if (!a || !b || a.archived_at || b.archived_at) { plan.already.push({ r }); continue }
  if (!nameMatch(a.name, b.name)) { plan.hold.push({ r, a, b, why: 'names differ - same spot, maybe two businesses' }); continue }
  let [winner, loser] = richness(a) >= richness(b) ? [a, b] : [b, a]
  let wrongCountry = false
  if (a.country !== b.country) {
    // Identical coordinates, so the coordinates' country decides which row is right.
    const c = await coordCountry(a.latitude, a.longitude)
    const right = [a, b].filter(p => p.country === c)
    if (right.length !== 1) { plan.hold.push({ r, a, b, why: `countries differ (${a.country} / ${b.country}), coordinates say ${c}` }); continue }
    winner = right[0]; loser = right[0] === a ? b : a; wrongCountry = true
    if (protectedRow(loser)) { plan.hold.push({ r, a, b, why: `wrong-country row (${loser.country}) has reviews or was added by a person` }); continue }
  }
  if (!wrongCountry && protectedRow(loser)) {
    if (protectedRow(winner)) { plan.hold.push({ r, a, b, why: 'both rows have reviews or were added by a person' }); continue }
    ;[winner, loser] = [loser, winner]
  }
  const labels = [a.city, b.city].filter(Boolean)
  let city = winner.city
  // An import truncated a trailing "s" from many city names (Worms -> Worm, Hohenems -> Hohenem).
  const full = labels.find(l => labels.some(m => m + 's' === l))
  if (full) city = full
  else if (wrongCountry) city = (!winner.city || winner.city === winner.country) ? loser.city : winner.city
  else if (labels.length) {
    const scored = await Promise.all(labels.map(async c => [c, await count(a.country, c)]))
    scored.sort((x, y) => y[1] - x[1])
    // A city label that is just the country name ("Spain") is never the right one.
    city = (scored.find(([c]) => c !== a.country) || scored[0])[0]
  }
  plan.merge.push({ r, winner, loser, city })
}
console.log(`merge ${plan.merge.length}  hold ${plan.hold.length}  already-resolved ${plan.already.length}`)
for (const m of plan.merge) console.log(`  keep "${m.winner.name}" [${m.winner.city} -> ${m.city}]  archive "${m.loser.name}" [${m.loser.city}]`)
console.log('--- holds')
for (const h of plan.hold) console.log(`  "${h.a.name}" (${h.a.city}) / "${h.b.name}" (${h.b.city})  [${h.why}]`)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }

fs.writeFileSync('reports/label-check/rollback-city-pairs-2026-10-15.json',
  JSON.stringify(plan.merge.map(m => ({ report: m.r.id, winner: m.winner, loser: m.loser })), null, 1))
const now = new Date().toISOString()
let n = 0
for (const m of plan.merge) {
  if (m.loser.slug) {
    const { error } = await sb.from('place_slug_aliases').upsert({ old_slug: m.loser.slug, place_id: m.winner.id }, { onConflict: 'old_slug', ignoreDuplicates: true })
    if (error) throw error
  }
  let { error } = await sb.from('places').update({ archived_at: now, archived_reason: `duplicate_merged_into:${m.winner.id}` }).eq('id', m.loser.id)
  if (error) throw error
  if (m.city && m.city !== m.winner.city) {
    ;({ error } = await sb.from('places').update({
      city: m.city,
      admin_notes: `${m.winner.admin_notes ? m.winner.admin_notes + '\n' : ''}[${TAG}] city "${m.winner.city}" -> "${m.city}" (merged duplicate ${m.loser.id})`,
    }).eq('id', m.winner.id))
    if (error) throw error
  }
  ;({ error } = await sb.from('place_reports').update({ status: 'reviewed' }).eq('id', m.r.id))
  if (error) throw error
  n++
}
for (const h of plan.hold) {
  const { error } = await sb.from('place_reports').update({ note: `${h.r.note} | Re-checked 2026-10-15: ${h.why}` }).eq('id', h.r.id)
  if (error) throw error
}
for (const x of plan.already) await sb.from('place_reports').update({ status: 'reviewed' }).eq('id', x.r.id)
console.log(`APPLIED merged ${n}, held ${plan.hold.length}, closed ${plan.already.length}`)
