#!/usr/bin/env node
// Fills real coordinates for places tagged 'approximate_location' (see
// flag-approximate-locations.mjs) from OpenStreetMap via Nominatim.
//
// Only restaurants, shops and stays: organisations (mostly sanctuaries) often
// keep their address private on purpose, so they stay approximate.
//
// A Nominatim result is accepted only when ALL hold:
//   - it is a venue (amenity / shop / tourism / craft / leisure)
//   - its OSM name equals our name after accent/case/punctuation folding (never fuzzy)
//   - it is in the same city (address city/town/village/municipality equals ours)
//   - it is the ONLY such result (chains with several branches are skipped)
//   - no other live place already carries that OSM element (would be a duplicate)
// Changing the coordinates drops the tag (trigger places_clear_approximate_location).
//
// Usage: node scripts/fix-approximate-locations-osm.mjs [--apply] [--limit N]
// Dry run writes the proposals to backups/; --apply also writes them to the DB
// and keeps the old values in the same file for rollback.

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const APPLY = process.argv.includes('--apply')
const LIMIT = Number(process.argv[process.argv.indexOf('--limit') + 1]) || Infinity
const UA = 'PlantsPack/1.0 (https://www.plantspack.com; hello@plantspack.com)'
const VENUE = new Set(['amenity', 'shop', 'tourism', 'craft', 'leisure'])

const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[^a-z0-9Ѐ-ӿ֐-ۿ぀-鿿]+/g, ' ').trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const places = []
let last = null
for (;;) {
  let q = db.from('places').select('id, slug, name, latitude, longitude, category, address, city, country, tags')
    .is('archived_at', null).contains('tags', ['approximate_location']).in('category', ['eat', 'store', 'hotel'])
    .order('id').limit(1000)
  if (last) q = q.gt('id', last)
  const { data, error } = await q
  if (error) throw error
  if (!data.length) break
  places.push(...data)
  last = data.at(-1).id
}
const { data: refRows } = await db.from('places').select('osm_ref').is('archived_at', null).not('osm_ref', 'is', null).limit(100000)
const takenRefs = new Set((refRows || []).map((r) => r.osm_ref))

const results = []
let n = 0
for (const p of places.slice(0, LIMIT)) {
  n++
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&namedetails=1&limit=10&q=${encodeURIComponent(`${p.name}, ${p.city}, ${p.country}`)}`
  let hits = []
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } })
    hits = r.ok ? await r.json() : []
  } catch { hits = [] }
  await sleep(1100)

  const ours = fold(p.name)
  const city = fold(p.city)
  const ok = hits.filter((h) => {
    if (!VENUE.has(h.category)) return false
    const names = [h.name, ...Object.values(h.namedetails || {})].map(fold)
    if (!names.includes(ours)) return false
    const a = h.address || {}
    return [a.city, a.town, a.village, a.municipality, a.city_district, a.suburb].map(fold).includes(city)
  })
  const ref = ok.length === 1 ? `${ok[0].osm_type}/${ok[0].osm_id}` : null
  let verdict = ok.length === 1 ? 'match' : ok.length > 1 ? 'ambiguous' : 'no_match'
  if (ref && takenRefs.has(`osm-${ok[0].osm_type}-${ok[0].osm_id}`)) verdict = 'osm_element_already_listed'

  const row = { id: p.id, slug: p.slug, name: p.name, city: p.city, verdict, osm: ref, old: { latitude: p.latitude, longitude: p.longitude, address: p.address } }
  if (verdict === 'match') {
    const h = ok[0]
    const a = h.address || {}
    const street = [a.road, a.house_number].filter(Boolean).join(' ')
    const locality = [a.postcode, a.city || a.town || a.village || p.city].filter(Boolean).join(' ')
    // Keep an address we already have at street level; replace only city-level ones.
    const cityLevel = !p.address || !/\d/.test(p.address)
    row.new = { latitude: Number(h.lat), longitude: Number(h.lon), address: cityLevel && street ? `${street}, ${locality}` : p.address }
    if (APPLY) {
      const { error } = await db.from('places').update(row.new).eq('id', p.id)
      row.applied = !error
      if (error) row.error = error.message
    }
  }
  results.push(row)
  if (n % 50 === 0) console.log(`${n}/${Math.min(places.length, LIMIT)} done, matches so far: ${results.filter((r) => r.verdict === 'match').length}`)
}

const out = new URL(`../backups/approximate-location-osm-${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().slice(0, 10)}.json`, import.meta.url)
fs.mkdirSync(new URL('../backups/', import.meta.url), { recursive: true })
fs.writeFileSync(out, JSON.stringify(results, null, 1))
const count = Object.entries(results.reduce((m, r) => ((m[r.verdict] = (m[r.verdict] || 0) + 1), m), {}))
console.log(`checked ${results.length}:`, count, `\nwritten to ${out.pathname}`)
