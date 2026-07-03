// Seed the admin "Duplicates" queue with machine-detected duplicate candidates.
//
// A candidate pair = two LIVE places within ~30m that share a name token (or
// are an exact name match). This is the cross-source import artifact (VegGuide
// vs OSM etc.) surfaced by the Appelier / De Appelier report.
//
// Writes ONE place_reports row per pair (type='duplicate', user_id=NULL, so it's
// clearly system-generated), pointing place_id -> the weaker/removable candidate
// and related_place_id -> the stronger/keep candidate (admin decides in the UI).
// NOTHING on the places table is touched, nothing is archived or deleted. Fully
// reversible:  DELETE FROM place_reports WHERE type='duplicate' AND user_id IS NULL;
//
// Idempotent: skips a pair that already has a pending duplicate report in either
// direction. Dry-run by default; pass --apply to insert.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const APPLY = process.argv.includes('--apply')
const NEAR_M = 30
const CELL = 0.0004 // ~44m grid cells; scan the 3x3 neighbourhood
// Generic type/cuisine/entity words are NOT distinctive - two different places
// sharing only "sanctuary" or "pizza" are not duplicates. A pair must match on
// a real name, so these are stripped before token comparison.
const STOP = new Set([
  'cafe', 'vegan', 'restaurant', 'bar', 'food', 'foods', 'shop', 'store', 'kitchen', 'house', 'coffee',
  'the', 'and', 'de', 'la', 'le', 'el', 'los', 'las', 'bio', 'vegetarian', 'organic', 'grill', 'bistro',
  'sanctuary', 'animal', 'animals', 'rescue', 'farm', 'centre', 'center', 'market', 'supermarket', 'garden',
  'health', 'juice', 'green', 'plant', 'based', 'plantbased', 'deli', 'pizza', 'pizzeria', 'sushi', 'thai',
  'indian', 'chinese', 'mexican', 'burger', 'burgers', 'eatery', 'catering', 'company', 'hotel', 'guesthouse',
  'guest', 'lounge', 'bakery', 'bakehouse', 'cuisine', 'veggie', 'natural', 'express', 'corner', 'place',
  'spot', 'club', 'retreat', 'takeaway', 'takeout', 'diner', 'canteen', 'buffet', 'street', 'road',
])

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY)

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const toks = (s) => norm(s).split(' ').filter((w) => w.length >= 4 && !STOP.has(w))
const dist = (a1, o1, a2, o2) => Math.hypot((a1 - a2) * 111000, (o1 - o2) * 111000 * Math.cos(a1 * Math.PI / 180))
// Completeness score — higher = better "keep" candidate. Prefer rows with an
// image, website, description, phone, hours, and an OSM source (well-maintained).
const score = (p) => (p.main_image_url ? 4 : 0) + (p.website ? 2 : 0) + (p.description ? 1 : 0) + (p.phone ? 1 : 0) + (p.opening_hours ? 1 : 0) + (/osm/i.test(p.source || '') ? 1 : 0)

async function main() {
  let rows = [], from = 0
  for (;;) {
    const { data } = await db.from('places')
      .select('id,name,latitude,longitude,source,main_image_url,website,description,phone,opening_hours')
      .is('archived_at', null).not('latitude', 'is', null).range(from, from + 999)
    if (!data?.length) break
    rows.push(...data); if (data.length < 1000) break; from += 1000
  }
  console.log(`Live places with coords: ${rows.length}`)

  // Existing pending duplicate pairs (either direction) -> skip.
  const { data: existing } = await db.from('place_reports').select('place_id, related_place_id').eq('type', 'duplicate').eq('status', 'pending')
  const seenPair = new Set((existing || []).flatMap((r) => r.related_place_id ? [[r.place_id, r.related_place_id].sort().join('|')] : []))

  const grid = new Map()
  for (const p of rows) { const k = `${Math.round(p.latitude / CELL)}:${Math.round(p.longitude / CELL)}`; (grid.get(k) || grid.set(k, []).get(k)).push(p) }

  // Coordinate-collision detection: many places sharing the EXACT same 5-dp
  // coordinate is a geocoding fallback (city/country centroid), not a real
  // cluster. For those, proximity is meaningless, so we demand an exact/prefix
  // NAME match and never trust a mere shared token.
  const coordCount = new Map()
  for (const p of rows) { const k = `${p.latitude.toFixed(5)}:${p.longitude.toFixed(5)}`; coordCount.set(k, (coordCount.get(k) || 0) + 1) }
  const unreliable = (p) => (coordCount.get(`${p.latitude.toFixed(5)}:${p.longitude.toFixed(5)}`) || 0) > 3

  // One normalised name is a prefix of the other at a word boundary
  // ("whale tail" vs "whale tail cafe"). Shorter side must be >= 5 chars.
  const prefixContain = (a, b) => {
    if (a.length < 5 || b.length < 5) return false
    const [s, l] = a.length <= b.length ? [a, b] : [b, a]
    return l === s || l.startsWith(s + ' ')
  }
  const jaccard = (A, B) => { if (!A.length || !B.length) return 0; const sa = new Set(A), sb = new Set(B); let i = 0; for (const t of sa) if (sb.has(t)) i++; return i / (sa.size + sb.size - i) }

  const pairs = []
  for (const p of rows) {
    const ci = Math.round(p.latitude / CELL), cj = Math.round(p.longitude / CELL)
    const pt = toks(p.name), pn = norm(p.name)
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const b = grid.get(`${ci + di}:${cj + dj}`); if (!b) continue
      for (const q of b) {
        if (q.id <= p.id) continue
        const d = dist(p.latitude, p.longitude, q.latitude, q.longitude)
        if (d > NEAR_M) continue
        const qn = norm(q.name), qt = toks(q.name)
        const exact = pn.length >= 4 && pn === qn
        const prefix = prefixContain(pn, qn)
        const shared = pt.filter((t) => qt.includes(t)).length
        const strongToken = shared >= 2 || (shared >= 1 && jaccard(pt, qt) >= 0.5)
        // If either place has fallback coords, proximity is untrustworthy: the
        // NAME must match strongly (exact/prefix). Otherwise a shared distinctive
        // token or high overlap is enough since they're genuinely ~30m apart.
        const match = (unreliable(p) || unreliable(q))
          ? (exact || prefix)
          : (exact || prefix || strongToken)
        if (!match) continue
        const key = [p.id, q.id].sort().join('|')
        if (seenPair.has(key)) continue
        seenPair.add(key)
        // keep = higher completeness; remove = the other (place_id points at remove)
        const keep = score(q) >= score(p) ? q : p
        const remove = keep === q ? p : q
        pairs.push({ place_id: remove.id, related_place_id: keep.id, d: Math.round(d), pair: `${remove.name}  ->merge into->  ${keep.name}` })
      }
    }
  }

  console.log(`New candidate pairs: ${pairs.length}`)
  console.log(pairs.slice(0, 15).map((p) => `  ${p.d}m  ${p.pair}`).join('\n'))

  if (!APPLY) { console.log('\nDRY RUN — pass --apply to insert these into the Duplicates queue.'); return }

  let inserted = 0
  for (let i = 0; i < pairs.length; i += 200) {
    const batch = pairs.slice(i, i + 200).map((p) => ({
      place_id: p.place_id, related_place_id: p.related_place_id, user_id: null,
      type: 'duplicate', status: 'pending', note: `auto: possible duplicate (${p.d}m apart)`,
    }))
    const { error } = await db.from('place_reports').insert(batch)
    if (error) { console.error('insert error:', error.message); break }
    inserted += batch.length
  }
  console.log(`Inserted ${inserted} duplicate candidates into place_reports.`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
