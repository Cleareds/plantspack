// OSM Overpass gap audit for Brazil diet:vegan=only
// Brazil bbox: ~ -33.75 to 5.27 latitude, -73.99 to -34.79 longitude
// Split into manageable quadrants to avoid 504.
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Brazil south-to-north + west-to-east — 8 strips
const QUADRANTS = [
  '-33.75,-58.5,-19.5,-46.5',   // South incl. SP/RJ/RS/PR/SC
  '-33.75,-46.5,-19.5,-34.79',  // Southeast coastal
  '-19.5,-58.5,-5.0,-46.5',     // Central west + interior NE
  '-19.5,-46.5,-5.0,-34.79',    // Coastal NE
  '-5.0,-73.99,5.27,-60.0',     // Amazon NW
  '-5.0,-60.0,5.27,-46.5',      // Amazon NE
]
function queryFor(bbox) {
  return `[out:json][timeout:120];(node["diet:vegan"="only"](${bbox});way["diet:vegan"="only"](${bbox}););out center tags;`
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
  await new Promise(r=>setTimeout(r,2500))
}
console.log(`Total: ${all.length} elements`)

const existingIds = new Set()
let from = 0
while (true) {
  const { data } = await sb.from('places').select('source_id').eq('country','Brazil').not('source_id','is',null).range(from,from+999)
  if (!data?.length) break
  for (const r of data) if (r.source_id) existingIds.add(r.source_id)
  if (data.length<1000) break; from+=1000
}
console.log(`Existing Brazil source_ids: ${existingIds.size}`)

const ascii = (s)=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss')
const norm = (s)=>ascii(s).toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim()
const nameIdx = new Map()
from = 0
while (true) {
  const { data } = await sb.from('places').select('name,city').eq('country','Brazil').is('archived_at',null).range(from,from+999)
  if (!data?.length) break
  for (const r of data) {
    const c = ascii(r.city||'').toLowerCase()
    if (!nameIdx.has(c)) nameIdx.set(c, new Set())
    nameIdx.get(c).add(norm(r.name))
  }
  if (data.length<1000) break; from+=1000
}

const NON_BR_COUNTRIES = new Set(['AR','UY','PY','BO','PE','CO','VE','GY','SR','GF'])
const candidates = []
const skipped = { srcId: 0, name: 0, foreign: 0, nocity: 0 }
for (const el of all) {
  const id = `osm-${el.type}-${el.id}`
  if (existingIds.has(id)) { skipped.srcId++; continue }
  const t = el.tags || {}
  const name = t.name || t['name:en'] || t['name:pt']
  if (!name) continue
  if (NON_BR_COUNTRIES.has((t['addr:country']||'').toUpperCase())) { skipped.foreign++; continue }
  const cityRaw = t['addr:city'] || t['addr:suburb']
  if (!cityRaw) { skipped.nocity++; continue }
  const cityAscii = ascii(cityRaw).toLowerCase()
  if ((nameIdx.get(cityAscii)||new Set()).has(norm(name))) { skipped.name++; continue }
  candidates.push({
    name, city: cityRaw, country: 'Brazil', vegan_level: 'fully_vegan',
    address: [t['addr:street'] && t['addr:housenumber'] ? `${t['addr:street']} ${t['addr:housenumber']}` : t['addr:street'], t['addr:postcode'], cityRaw, 'Brazil'].filter(Boolean).join(', '),
    latitude: el.lat || el.center?.lat,
    longitude: el.lon || el.center?.lon,
    website: t.website || t['contact:website'],
    phone: t.phone || t['contact:phone'],
    opening_hours: t.opening_hours,
    cuisine_types: t.cuisine ? t.cuisine.split(';').map(s=>s.trim()) : undefined,
    notes: `OSM diet:vegan=only (${el.type} ${el.id})`,
  })
}
console.log(`\nSkipped — source_id ${skipped.srcId}, name ${skipped.name}, foreign ${skipped.foreign}, no-city ${skipped.nocity}`)
console.log(`New candidates: ${candidates.length}`)
const byCity = {}
for (const c of candidates) byCity[c.city] = (byCity[c.city]||0)+1
console.log('Top cities (new candidates):')
Object.entries(byCity).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([c,n])=>console.log(`  ${c.padEnd(28)} ${n}`))

fs.mkdirSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/scripts/seo-out/brazil-osm-gap-2026-05-21', { recursive: true })
fs.writeFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/scripts/seo-out/brazil-osm-gap-2026-05-21/candidates.json', JSON.stringify(candidates, null, 2))
console.log('✓ Wrote candidates.json')
