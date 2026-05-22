// OSM secondary-tag sweep: cuisine=vegan (NOT just diet:vegan) for Germany.
// Weaker trust than diet:vegan=only — default vegan_level=vegan_friendly so
// they're not over-claimed; users + manual verification can promote later.
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const QUADRANTS = [
  '47.27,5.87,49.22,10.455','47.27,10.455,49.22,15.04',
  '49.22,5.87,51.165,10.455','49.22,10.455,51.165,15.04',
  '51.165,5.87,53.11,10.455','51.165,10.455,53.11,15.04',
  '53.11,5.87,55.06,10.455','53.11,10.455,55.06,15.04',
]
function queryFor(bbox) {
  return `[out:json][timeout:120];(node["cuisine"~"vegan"](${bbox});way["cuisine"~"vegan"](${bbox}););out center tags;`
}
function fetchOverpass(q) {
  return new Promise((resolve, reject) => {
    const child = spawn('curl', ['-fsS', '--max-time', '180', '-X', 'POST',
      '-A', 'plantspack-osm-audit/1.0', '--data-urlencode', `data=${q}`,
      'https://overpass-api.de/api/interpreter'], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = '', err = ''
    child.stdout.on('data', d => { out += d })
    child.stderr.on('data', d => { err += d })
    child.on('exit', code => code === 0 ? resolve(out) : reject(new Error(err)))
  })
}

const all = []
for (const bbox of QUADRANTS) {
  process.stdout.write(`  ${bbox}: `)
  let ok = false
  for (let a = 0; a < 3 && !ok; a++) {
    try {
      const j = JSON.parse(await fetchOverpass(queryFor(bbox)))
      console.log(`${j.elements.length} elements`)
      all.push(...j.elements); ok = true
    } catch (e) { process.stdout.write(`retry... `); await new Promise(r=>setTimeout(r,5000)) }
  }
  if (!ok) console.log('FAIL')
  await new Promise(r=>setTimeout(r,3000))
}
console.log(`Total: ${all.length} elements`)

const existingIds = new Set()
let from = 0
while (true) {
  const { data } = await sb.from('places').select('source_id').eq('country','Germany').not('source_id','is',null).range(from,from+999)
  if (!data?.length) break
  for (const r of data) if (r.source_id) existingIds.add(r.source_id)
  if (data.length<1000) break; from+=1000
}
console.log(`Existing Germany source_ids: ${existingIds.size}`)

const ascii = (s) => (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss')
const norm = (s) => ascii(s).toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim()
const nameIdx = new Map()
from = 0
while (true) {
  const { data } = await sb.from('places').select('name,city').eq('country','Germany').is('archived_at',null).range(from,from+999)
  if (!data?.length) break
  for (const r of data) {
    const c = ascii(r.city||'').toLowerCase()
    if (!nameIdx.has(c)) nameIdx.set(c, new Set())
    nameIdx.get(c).add(norm(r.name))
  }
  if (data.length<1000) break; from+=1000
}

const NON_DE_COUNTRIES = new Set(['CH','AT','CZ','LU','NL','FR','BE','PL','DK'])
const candidates = []
for (const el of all) {
  const id = `osm-${el.type}-${el.id}`
  if (existingIds.has(id)) continue
  const t = el.tags || {}
  const name = t.name || t['name:en'] || t['name:de']
  if (!name) continue
  if (NON_DE_COUNTRIES.has((t['addr:country']||'').toUpperCase())) continue
  const cityRaw = t['addr:city'] || t['addr:suburb']
  if (!cityRaw) continue
  const cityAscii = ascii(cityRaw).toLowerCase()
  if ((nameIdx.get(cityAscii)||new Set()).has(norm(name))) continue
  // Determine vegan_level: if diet:vegan=only also tagged → fully_vegan, else vegan_friendly
  const isStrong = t['diet:vegan'] === 'only' || /\b(vegan)\b/i.test(name)
  candidates.push({
    name, city: cityRaw, country: 'Germany',
    vegan_level: isStrong ? 'fully_vegan' : 'vegan_friendly',
    address: [t['addr:street'] && t['addr:housenumber'] ? `${t['addr:street']} ${t['addr:housenumber']}` : t['addr:street'], t['addr:postcode'], cityRaw, 'Germany'].filter(Boolean).join(', '),
    latitude: el.lat || el.center?.lat,
    longitude: el.lon || el.center?.lon,
    website: t.website || t['contact:website'],
    phone: t.phone || t['contact:phone'],
    cuisine_types: t.cuisine ? t.cuisine.split(';').map(s=>s.trim()) : undefined,
    opening_hours: t.opening_hours,
    notes: `OSM cuisine~vegan (${el.type} ${el.id})${isStrong ? ' + strong signal' : ''}`,
  })
}
console.log(`\nNew candidates (after dedup): ${candidates.length}`)
const byLevel = {}
for (const c of candidates) byLevel[c.vegan_level] = (byLevel[c.vegan_level]||0)+1
console.log(`By level:`, byLevel)
const byCity = {}
for (const c of candidates) byCity[c.city] = (byCity[c.city]||0)+1
console.log('Top cities:')
Object.entries(byCity).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([c,n])=>console.log(`  ${c.padEnd(28)} ${n}`))

fs.mkdirSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/scripts/seo-out/germany-osm-cuisine-2026-05-19', { recursive: true })
fs.writeFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/scripts/seo-out/germany-osm-cuisine-2026-05-19/candidates.json', JSON.stringify(candidates, null, 2))
console.log(`✓ Wrote candidates.json`)
