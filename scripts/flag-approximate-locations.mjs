#!/usr/bin/env node
// Tags places whose coordinates are a city/country centre with 'approximate_location'.
// Apps keep tagged places out of "Near you"; /admin/data-quality lists them.
// The DB trigger places_clear_approximate_location drops the tag when the
// coordinates change, so fixed places leave the queue by themselves.
//
// Rule (no OSM link, OSM coordinates are real nodes):
//   - shared_point: 4+ live places on the exact same 5-dp coordinate, or
//   - city_level_address: the address is only "City[, Region], Country" (no digits,
//     first part equals the city or the country).
//
// Usage: node scripts/flag-approximate-locations.mjs [--apply]
// Without --apply it only prints counts. With --apply it writes the list of
// tagged ids to backups/ (rollback: remove the tag from those ids).

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
const APPLY = process.argv.includes('--apply')
const TAG = 'approximate_location'

const all = []
let last = null
for (;;) {
  let q = db.from('places').select('id, name, latitude, longitude, category, address, city, country, osm_ref, tags')
    .is('archived_at', null).not('latitude', 'is', null).order('id').limit(1000)
  if (last) q = q.gt('id', last)
  const { data, error } = await q
  if (error) throw error
  if (!data.length) break
  all.push(...data)
  last = data.at(-1).id
}

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const key = (p) => `${Number(p.latitude).toFixed(5)},${Number(p.longitude).toFixed(5)}`
const stack = new Map()
for (const p of all) stack.set(key(p), (stack.get(key(p)) || 0) + 1)

const cityLevel = (p) => {
  const a = norm(p.address)
  if (!a || /\d/.test(a)) return false
  const segs = a.split(',').map((s) => s.split(' - ')[0].trim())
  return segs.length <= 4 && (segs[0] === norm(p.city) || segs[0] === norm(p.country))
}
const reason = (p) => {
  if (p.osm_ref) return null
  if (stack.get(key(p)) >= 4) return 'shared_point'
  if (cityLevel(p)) return 'city_level_address'
  return null
}

const flagged = all.filter((p) => reason(p))
const todo = flagged.filter((p) => !(p.tags || []).includes(TAG))
const count = (f) => Object.entries(flagged.reduce((m, p) => ((m[f(p)] = (m[f(p)] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1])
console.log(`live with coords: ${all.length}; approximate: ${flagged.length}; not yet tagged: ${todo.length}`)
console.log('by reason', count(reason))
console.log('by category', count((p) => p.category))

if (!APPLY) process.exit(0)

fs.mkdirSync(new URL('../backups/', import.meta.url), { recursive: true })
const out = new URL(`../backups/approximate-location-tagged-${new Date().toISOString().slice(0, 10)}.json`, import.meta.url)
fs.writeFileSync(out, JSON.stringify(todo.map((p) => ({ id: p.id, reason: reason(p) })), null, 1))

let done = 0
for (let i = 0; i < todo.length; i += 10) {
  await Promise.all(todo.slice(i, i + 10).map(async (p) => {
    const { error } = await db.from('places').update({ tags: [...(p.tags || []), TAG] }).eq('id', p.id)
    if (error) console.error(p.id, error.message)
    else done++
  }))
}
console.log(`tagged ${done}; ids saved to ${out.pathname}`)
