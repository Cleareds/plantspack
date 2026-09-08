#!/usr/bin/env node
/**
 * Work the 452 machine-seeded duplicate pairs ("auto: possible duplicate
 * (Nm apart)"). Dry-run by default; pass --apply to write.
 *
 * Only the decisive buckets are acted on:
 *   ALREADY   one side is already archived        -> close the report
 *   MERGE     same registered domain and <500m apart, OR normalised names
 *             >=0.85 similar and <=150m apart with no conflicting domain
 *                                                 -> archive the weaker row
 *   DISMISS   different registered domains, or names too dissimilar to be
 *             the same business                   -> close the report, keep both
 *
 * Everything else stays pending on purpose. Chains with genuinely adjacent
 * branches live in that gap (Plant Power San Diego, Soul Vegetarian Atlanta),
 * and guessing there would delete real listings.
 *
 * Guards: never archive a row that has reviews; skip pairs sitting on a
 * coordinate shared by more than four rows (a food-court or bad-geocode
 * artifact, not proof of co-location); and skip pairs whose coordinates are
 * byte-identical while their city labels disagree, since identical coordinates
 * from two different imports do not by themselves prove the same address.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const APPLY = process.argv.includes('--apply')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const now = new Date().toISOString()

// Name comparison is TOKEN based, not character based. A first pass used
// Levenshtein over stopword-stripped, concatenated names and it was badly
// wrong: "Govindas Restaurante Vegetariano" vs "Restaurante Vegetariano
// Govindas" scored 0.16 (word order), and "Lucy's Cafe" vs "Lucy's Heritage
// Cafe" scored 0.38 (one name being a superset of the other) - both obvious
// duplicates it wanted to dismiss.
const STOP = new Set(['the','le','la','el','il','de','het','een','a','an','and','of',
  'restaurant','restaurante','ristorante','restoran','cafe','caffe','caffè','coffee',
  'bar','bistro','kitchen','house','vegan','veganes','vegano','vegana','vegetarian',
  'vegetariano','vegetariana','chay','gmbh','ltd','bv','inc','llc','co'])
const tokens = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
  .filter(t => t && !STOP.has(t))
/**
 * 1.0 when one name's meaningful tokens are a subset of the other's (so
 * "SOPHRA" vs "SOPHRA Traditional Albanian Restaurant Saranda" matches, and
 * word order never matters), otherwise Jaccard overlap of the token sets.
 */
function nameMatch(n1, n2) {
  const A = new Set(tokens(n1)), B = new Set(tokens(n2))
  if (!A.size || !B.size) return { score: 0, shared: 0 }
  const shared = [...A].filter(t => B.has(t)).length
  const contained = shared === Math.min(A.size, B.size)
  return { score: contained ? 1 : shared / (A.size + B.size - shared), shared }
}
// Hosts that many unrelated venues share. Matching on these would call every
// pair of Facebook-only listings the same brand, which it caught doing.
const AGGREGATORS = new Set(['facebook', 'instagram', 'google', 'linktr', 'linktree',
  'wixsite', 'wix', 'business', 'sites', 'weebly', 'squarespace', 'wordpress', 'blogspot',
  'tripadvisor', 'happycow', 'yelp', 'ubereats', 'deliveroo', 'justeat', 'foodpanda',
  'grubhub', 'doordash', 'opentable', 'thefork', 'zomato', 'qopla', 'shopify', 'myshopify',
  'vk', 'shopselect', 'stores', 'base', 'tabelog', 'goo', 'ameblo', 'jimdo', 'jimdofree',
  'strikingly', 'webnode', 'mystrikingly', 'carrd', 'notion', 'bit', 'linkr'])
/** Registrable brand label, so tofuvegan.co.uk and tofuvegan.com are one brand. */
const brand = d => {
  if (!d) return null
  const parts = d.split('.')
  const multi = /^(co|com|org|net|gov|ac|edu)$/
  const label = parts.length > 2 && multi.test(parts[parts.length - 2])
    ? parts[parts.length - 3] : parts[parts.length - 2] || d
  return AGGREGATORS.has(label) ? null : label
}
const dist = (a, b, c, d) => {
  const r = x => x * Math.PI / 180
  const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(h)))
}
const domain = u => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase() } catch { return null } }
const score = p => (p.review_count || 0) * 100 + (p.is_verified ? 40 : 0) + (p.verification_level || 0) * 5 +
  (p.website ? 8 : 0) + (p.opening_hours ? 5 : 0) + (p.main_image_url ? 4 : 0) +
  (p.description && p.description.length > 20 ? 2 : 0) + (p.address && p.address.length > 12 ? 3 : 0)

const { data: reports } = await sb.from('place_reports')
  .select('id, place_id, related_place_id').eq('type', 'duplicate').eq('status', 'pending').limit(1000)
const auto = reports.filter(r => r.related_place_id)
const ids = [...new Set(auto.flatMap(r => [r.place_id, r.related_place_id]))]
const P = {}
for (let i = 0; i < ids.length; i += 200) {
  const { data } = await sb.from('places')
    .select('id,name,slug,city,country,address,latitude,longitude,website,opening_hours,main_image_url,description,is_verified,verification_level,review_count,archived_at')
    .in('id', ids.slice(i, i + 200))
  for (const p of data) P[p.id] = p
}
const coordN = {}
for (const id of ids) { const p = P[id]; if (p) { const k = `${p.latitude},${p.longitude}`; coordN[k] = (coordN[k] || 0) + 1 } }

const plan = { already: [], merge: [], dismiss: [], hold: [] }
for (const r of auto) {
  const a = P[r.place_id], b = P[r.related_place_id]
  if (!a || !b) { plan.already.push({ r }); continue }
  if (a.archived_at || b.archived_at) { plan.already.push({ r, a, b }); continue }

  const d = dist(a.latitude, a.longitude, b.latitude, b.longitude)
  const nm = nameMatch(a.name, b.name)
  const s = nm.score
  const da = domain(a.website), db = domain(b.website)
  const hot = coordN[`${a.latitude},${a.longitude}`] > 4 || coordN[`${b.latitude},${b.longitude}`] > 4
  const identicalButDifferentCity = d === 0 && (a.city || '') !== (b.city || '')

  const sameBrand = !!(da && db && brand(da) === brand(db))
  // Only a genuinely different BRAND, and only when they are not effectively
  // on top of each other, is evidence of two different businesses.
  if (da && db && !sameBrand && d > 100) { plan.dismiss.push({ r, a, b, d, s, why: `different brands (${brand(da)} vs ${brand(db)}), ${d}m apart` }); continue }
  if (hot || identicalButDifferentCity) {
    plan.hold.push({ r, a, b, d, s, why: hot ? 'coordinate shared by >4 rows' : 'identical coordinates but different city labels' })
    continue
  }
  if (sameBrand && d < 500) { plan.merge.push({ r, a, b, d, s, why: `same brand ${brand(da)}, ${d}m apart` }); continue }
  // Containment on a SINGLE shared token is too weak to archive on, whatever
  // the distance: "Berliner Doner" vs "Berliner Restaurant & Bar" (27m) shares
  // only {berliner} and is plainly two businesses, while "Hibiscus Vegan Cafe"
  // vs "Hibiscus" (21m) shares only {hibiscus} and is plainly one. Nothing in
  // the data separates those two cases, so they all go to a human.
  if (s === 1 && nm.shared >= 2 && d <= 150) { plan.merge.push({ r, a, b, d, s, why: `one name contains the other (${nm.shared} shared tokens), ${d}m apart` }); continue }
  if (s === 1 && nm.shared < 2) { plan.hold.push({ r, a, b, d, s, why: `names overlap on only one token (${d}m apart) - could be one venue or two` }); continue }
  // No dismissal on name dissimilarity alone: the metric is not good enough
  // to close a report on, and a wrongly dismissed report loses the signal.
  plan.hold.push({ r, a, b, d, s, why: 'borderline - needs eyes (possible sibling branch)' })
}

// Never archive a row with reviews: flip or hold.
const merges = []
for (const m of plan.merge) {
  let winner = score(m.a) >= score(m.b) ? m.a : m.b
  let loser = winner === m.a ? m.b : m.a
  if ((loser.review_count || 0) > 0) {
    if ((winner.review_count || 0) > 0) { plan.hold.push({ ...m, why: 'both rows have reviews' }); continue }
    [winner, loser] = [loser, winner]
  }
  merges.push({ ...m, winner, loser })
}

console.log(`${auto.length} machine-seeded pairs\n`)
console.log(`  close (already archived) : ${plan.already.length}`)
console.log(`  merge                    : ${merges.length}`)
console.log(`  dismiss (not duplicates) : ${plan.dismiss.length}`)
console.log(`  hold for human review    : ${plan.hold.length}`)
// Risk probe: same-brand pairs that are far apart AND whose names do not
// contain one another could be genuine sibling branches of one chain.
const risky = merges.filter(m => m.d > 100 && m.s < 1)
console.log(`\n--- same-brand merges >100m apart whose names do NOT match (${risky.length}) ---`)
for (const m of risky)
  console.log(`  "${m.winner.name}" (${m.winner.city}) vs "${m.loser.name}" (${m.loser.city})  ${m.d}m sim=${m.s.toFixed(2)}  ${m.why}`)

console.log(`\n--- random sample of 15 merges ---`)
const seed = merges.slice().sort((x, y) => (x.loser.id < y.loser.id ? -1 : 1))
for (let i = 0; i < 15 && i < seed.length; i++) {
  const m = seed[Math.floor(i * seed.length / 15)]
  console.log(`  keep "${m.winner.name}" (${m.winner.city})  <-  archive "${m.loser.name}" (${m.loser.city})   [${m.why}]`)
}
console.log(`\n--- sample dismissals ---`)
for (const x of plan.dismiss.slice(0, 6))
  console.log(`  "${x.a.name}" (${x.a.city}) vs "${x.b.name}" (${x.b.city})  ${x.d}m  [${x.why}]`)
console.log(`\n--- sample holds ---`)
for (const x of plan.hold.slice(0, 6))
  console.log(`  "${x.a.name}" (${x.a.city}) vs "${x.b.name}" (${x.b.city})  ${x.d}m sim=${x.s.toFixed(2)}  [${x.why}]`)

if (!APPLY) { console.log('\nDRY RUN - pass --apply to write.'); process.exit(0) }

let done = 0
for (const m of merges) {
  if (m.loser.slug) {
    await sb.from('place_slug_aliases')
      .upsert({ old_slug: m.loser.slug, place_id: m.winner.id }, { onConflict: 'old_slug', ignoreDuplicates: true })
  }
  const { error } = await sb.from('places')
    .update({ archived_at: now, archived_reason: `duplicate_merged_into:${m.winner.id}` }).eq('id', m.loser.id)
  if (error) throw error
  await sb.from('place_reports').update({ status: 'reviewed' }).eq('id', m.r.id)
  done++
}
const dismissIds = plan.dismiss.map(x => x.r.id)
for (let i = 0; i < dismissIds.length; i += 100)
  await sb.from('place_reports').update({ status: 'dismissed' }).in('id', dismissIds.slice(i, i + 100))
const alreadyIds = plan.already.map(x => x.r.id)
for (let i = 0; i < alreadyIds.length; i += 100)
  await sb.from('place_reports').update({ status: 'reviewed' }).in('id', alreadyIds.slice(i, i + 100))

console.log(`\nAPPLIED  merged: ${done}  dismissed: ${dismissIds.length}  closed: ${alreadyIds.length}  still pending: ${plan.hold.length}`)
