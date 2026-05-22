import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const countries = [
  { name: 'Croatia', iso: 'HR', code: 'hr' },
  { name: 'Greece', iso: 'GR', code: 'gr' },
  { name: 'Turkey', iso: 'TR', code: 'tr' },
  { name: 'Portugal', iso: 'PT', code: 'pt' },
  { name: 'France', iso: 'FR', code: 'fr' },
  { name: 'Cyprus', iso: 'CY', code: 'cy' },
  { name: 'Malta', iso: 'MT', code: 'mt' },
  { name: 'Slovenia', iso: 'SI', code: 'si' },
  { name: 'Montenegro', iso: 'ME', code: 'me' },
  { name: 'Albania', iso: 'AL', code: 'al' },
  { name: 'Bulgaria', iso: 'BG', code: 'bg' },
]

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

const root = 'scripts/seo-out/osm-summer-hub-2026-05-16'
fs.mkdirSync(root, { recursive: true })
const log = `${root}/import-results.jsonl`
fs.writeFileSync(log, '')

for (const c of countries) {
  console.log(`\n=== ${c.name} (${c.iso}) ===`)
  const q = `[out:json][timeout:90];area["ISO3166-1"="${c.iso}"][admin_level=2];(node["diet:vegan"="only"](area);way["diet:vegan"="only"](area););out center tags;`
  const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: new URLSearchParams({ data: q }), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'plantspack-data-quality/1.0' } })
  if (!res.ok) { console.log(`  overpass error ${res.status}`); continue }
  const osm = await res.json()
  console.log(`  OSM candidates: ${osm.elements.length}`)
  const ours = []
  let from = 0
  while (true) {
    const { data } = await sb.from('places').select('id,name,source_id').eq('country', c.name).is('archived_at', null).range(from, from + 999)
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
      lon: e.lon || e.center?.lon,
      country: c.name,
      country_code: c.code
    })
  }
  console.log(`  Already: ${already}, Net new: ${news.length}`)
  let ok = 0, fail = 0
  for (const cnd of news) {
    const addr = [cnd.street, cnd.housenumber].filter(Boolean).join(' ')
    const full = [addr, cnd.postcode, cnd.city, c.name].filter(Boolean).join(', ')
    const payload = {
      name: cnd.name,
      city: cnd.city || c.name,
      country: c.name,
      country_code: c.code,
      category: 'eat',
      vegan_level: 'fully_vegan',
      address: full || c.name,
      latitude: cnd.lat,
      longitude: cnd.lon,
      phone: cnd.phone,
      website: cnd.website,
      opening_hours: cnd.opening_hours,
      cuisine_types: cnd.cuisine ? cnd.cuisine.split(';').map(x => x.trim()) : undefined,
      description: `OSM-tagged 100% vegan venue (${cnd.amenity || 'unknown'}). Imported via OSM cross-reference 2026-05-16 summer-hub.`,
      tags: ['osm_import', 'diet_vegan_only', 'summer_hub_osm_2026_05']
    }
    const r = await new Promise(resolve => {
      const child = spawn('npx', ['tsx', 'scripts/add-place.ts', '--imported', '--force-vegan-level'], { stdio: ['pipe', 'pipe', 'pipe'] })
      let out = ''
      child.stdout.on('data', d => { out += d })
      child.stderr.on('data', () => {})
      child.stdin.write(JSON.stringify(payload))
      child.stdin.end()
      const timer = setTimeout(() => { child.kill('SIGTERM'); resolve({ ok: false }) }, 60000)
      child.on('exit', code => { clearTimeout(timer); resolve({ ok: /Public URL/.test(out) && code === 0 }) })
    })
    if (r.ok) ok++; else fail++
    fs.appendFileSync(log, JSON.stringify({ country: c.name, ...cnd, ...r }) + '\n')
  }
  console.log(`  Imported: ${ok} ok, ${fail} failed`)
}
console.log('\n=== Done ===')
