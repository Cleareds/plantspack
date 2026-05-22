import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const q = `
[out:json][timeout:90];
area["ISO3166-1"="DE"][admin_level=2];
(
  node["diet:vegan"="only"](area);
  way["diet:vegan"="only"](area);
);
out center tags;`

const res = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  body: new URLSearchParams({ data: q }),
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'plantspack-data-quality/1.0' }
})
if (!res.ok) throw new Error(`overpass ${res.status}`)
const osm = await res.json()
console.log(`OSM candidates: ${osm.elements.length}`)

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

const ours = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('id,name,city,source_id').eq('country', 'Germany').is('archived_at', null).range(from, from + 999)
  if (!data?.length) break
  ours.push(...data); if (data.length < 1000) break; from += 1000
}
const ourSrc = new Set(ours.map(r => r.source_id).filter(Boolean))
const ourByName = new Map()
for (const r of ours) ourByName.set(norm(r.name), r)

const news = []
let already = 0
for (const e of osm.elements) {
  if (!e.tags?.name) continue
  const id = `osm-${e.type}-${e.id}`
  if (ourSrc.has(id)) { already++; continue }
  if (ourByName.has(norm(e.tags.name))) { already++; continue }
  if (e.tags.amenity && !['restaurant', 'cafe', 'fast_food', 'pub', 'bar', 'ice_cream'].includes(e.tags.amenity)) continue
  if (e.tags.shop && !['bakery', 'deli', 'convenience', 'health_food'].includes(e.tags.shop)) continue
  news.push({
    source_id: id,
    name: e.tags.name,
    city: e.tags['addr:city'],
    street: e.tags['addr:street'],
    housenumber: e.tags['addr:housenumber'],
    postcode: e.tags['addr:postcode'],
    phone: e.tags.phone,
    website: e.tags.website || e.tags['contact:website'],
    cuisine: e.tags.cuisine,
    opening_hours: e.tags.opening_hours,
    amenity: e.tags.amenity,
    lat: e.lat || e.center?.lat,
    lon: e.lon || e.center?.lon
  })
}
console.log(`Already in DB: ${already}`)
console.log(`Net new: ${news.length}`)

fs.mkdirSync('scripts/seo-out/osm-vegan-only-de-2026-05-16', { recursive: true })
const log = 'scripts/seo-out/osm-vegan-only-de-2026-05-16/import-results.jsonl'
fs.writeFileSync(log, '')
fs.writeFileSync('scripts/seo-out/osm-vegan-only-de-2026-05-16/candidates.json', JSON.stringify(news, null, 2))

// Import
let ok = 0, fail = 0
for (let i = 0; i < news.length; i++) {
  const c = news[i]
  const addr = [c.street, c.housenumber].filter(Boolean).join(' ')
  const full = [addr, c.postcode, c.city, 'Germany'].filter(Boolean).join(', ')
  const payload = {
    name: c.name,
    city: c.city || 'Germany',
    country: 'Germany',
    country_code: 'de',
    category: 'eat',
    vegan_level: 'fully_vegan',
    address: full || 'Germany',
    latitude: c.lat,
    longitude: c.lon,
    phone: c.phone,
    website: c.website,
    opening_hours: c.opening_hours,
    cuisine_types: c.cuisine ? c.cuisine.split(';').map(x => x.trim()) : undefined,
    description: `OSM-tagged 100% vegan venue (${c.amenity || 'unknown'}). Imported via OSM cross-reference 2026-05-16.`,
    tags: ['osm_import', 'diet_vegan_only']
  }
  process.stdout.write(`  [${i + 1}/${news.length}] ${c.name.slice(0, 35).padEnd(35)} ${(c.city || '?').slice(0, 20).padEnd(20)} `)
  const r = await new Promise(resolve => {
    const child = spawn('npx', ['tsx', 'scripts/add-place.ts', '--imported', '--force-vegan-level'], { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    child.stderr.on('data', () => {})
    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
    const timer = setTimeout(() => { child.kill('SIGTERM'); resolve({ ok: false, reason: 'timeout' }) }, 60000)
    child.on('exit', code => {
      clearTimeout(timer)
      const ok = /Public URL/.test(out) && code === 0
      resolve({ ok })
    })
  })
  if (r.ok) { ok++; console.log('✓') } else { fail++; console.log('✗') }
  fs.appendFileSync(log, JSON.stringify({ ...c, ...r }) + '\n')
}
console.log(`\nDone. ${ok} ok, ${fail} failed`)
