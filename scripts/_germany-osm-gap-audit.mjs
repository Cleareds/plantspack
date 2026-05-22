// OSM Overpass gap audit for Germany diet:vegan=only
// Pull all OSM nodes/ways with diet:vegan=only in Germany,
// dedup against current places.source_id (osm-<id>),
// and write candidates.json for tier2-sweep-import.
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Split Germany into 4x2 = 8 strips
const QUADRANTS = [
  '47.27,5.87,49.22,10.455',
  '47.27,10.455,49.22,15.04',
  '49.22,5.87,51.165,10.455',
  '49.22,10.455,51.165,15.04',
  '51.165,5.87,53.11,10.455',
  '51.165,10.455,53.11,15.04',
  '53.11,5.87,55.06,10.455',
  '53.11,10.455,55.06,15.04',
]
function queryFor(bbox) {
  return `[out:json][timeout:120];(node["diet:vegan"="only"](${bbox});way["diet:vegan"="only"](${bbox}););out center tags;`
}

function fetchOverpass(q) {
  return new Promise((resolve, reject) => {
    const child = spawn('curl', ['-fsS', '--max-time', '180', '-X', 'POST',
      '-A', 'plantspack-osm-audit/1.0',
      '--data-urlencode', `data=${q}`,
      'https://overpass-api.de/api/interpreter'], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = '', err = ''
    child.stdout.on('data', d => { out += d })
    child.stderr.on('data', d => { err += d })
    child.on('exit', code => code === 0 ? resolve(out) : reject(new Error(err)))
  })
}

console.log('Querying Overpass for diet:vegan=only in Germany (4 quadrants)...')
const allElements = []
for (let i = 0; i < QUADRANTS.length; i++) {
  const bbox = QUADRANTS[i]
  process.stdout.write(`  Q${i+1} ${bbox}: `)
  let attempts = 0
  while (attempts < 3) {
    try {
      const raw = await fetchOverpass(queryFor(bbox))
      const j = JSON.parse(raw)
      console.log(`${j.elements.length} elements`)
      allElements.push(...j.elements)
      break
    } catch (e) {
      attempts++
      if (attempts >= 3) console.log(`FAIL after retries: ${e.message.slice(0,80)}`)
      else { process.stdout.write(`retry ${attempts}... `); await new Promise(r => setTimeout(r, 5000)) }
    }
  }
  await new Promise(r => setTimeout(r, 3000))
}
const j = { elements: allElements }
console.log(`OSM elements total: ${j.elements.length}`)

// Get all existing source_ids in Germany
const existingIds = new Set()
let from = 0
while (true) {
  const { data } = await sb.from('places').select('source_id').eq('country', 'Germany').not('source_id', 'is', null).range(from, from + 999)
  if (!data?.length) break
  for (const r of data) if (r.source_id) existingIds.add(r.source_id)
  if (data.length < 1000) break; from += 1000
}
console.log(`Existing Germany source_ids: ${existingIds.size}`)

// Also build a per-city name index for fuzzy dedup
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
const nameIdx = new Map() // city -> Set(normalized names)
from = 0
while (true) {
  const { data } = await sb.from('places').select('name,city').eq('country', 'Germany').is('archived_at', null).range(from, from + 999)
  if (!data?.length) break
  for (const r of data) {
    const c = r.city || ''
    if (!nameIdx.has(c)) nameIdx.set(c, new Set())
    nameIdx.get(c).add(norm(r.name))
  }
  if (data.length < 1000) break; from += 1000
}

const cityAlias = (raw) => {
  const m = { 'München':'Munich','Köln':'Cologne','Nürnberg':'Nuremberg','Frankfurt am Main':'Frankfurt' }
  return m[raw] || raw
}

const candidates = []
const skipBySourceId = []
const skipByName = []
const NON_DE_CITIES = new Set(['Zürich','Zurich','Praha','Praha 6','Praha 7','Praha 2','Praha 1','Luxembourg','Salzburg','Wien','Vienna','Innsbruck','Linz','Graz','Klagenfurt','Bregenz','Dornbirn','Feldkirch','Kreuzlingen','Schaffhausen','St. Gallen','Basel','Bern','Genève','Geneva','Lausanne','Winterthur','Enschede','Groningen','Maastricht','Strasbourg','Mulhouse','Colmar','Metz','Nancy','Brno','Plzeň','Pilsen','Liberec'])
const NON_DE_COUNTRIES = new Set(['CH','AT','CZ','LU','NL','FR','BE','PL','DK'])
for (const el of j.elements) {
  const id = `osm-${el.type}-${el.id}`
  if (existingIds.has(id)) { skipBySourceId.push(id); continue }
  const t = el.tags || {}
  const name = t.name || t['name:en'] || t['name:de']
  if (!name) continue
  if (NON_DE_COUNTRIES.has((t['addr:country']||'').toUpperCase())) continue
  const cityRaw = t['addr:city'] || t['addr:suburb']
  if (!cityRaw) continue
  if (NON_DE_CITIES.has(cityRaw)) continue
  const city = cityAlias(cityRaw)
  const cityNames = nameIdx.get(city) || new Set()
  if (cityNames.has(norm(name))) { skipByName.push(`${name} | ${city}`); continue }
  const street = t['addr:street']
  const hno = t['addr:housenumber']
  const postcode = t['addr:postcode']
  const address = [street && hno ? `${street} ${hno}` : street, postcode, city, 'Germany'].filter(Boolean).join(', ')
  const lat = el.lat || el.center?.lat
  const lon = el.lon || el.center?.lon
  candidates.push({
    name,
    city,
    country: 'Germany',
    vegan_level: 'fully_vegan',
    address,
    latitude: lat,
    longitude: lon,
    website: t.website || t['contact:website'],
    phone: t.phone || t['contact:phone'],
    cuisine_types: t.cuisine ? t.cuisine.split(';').map(s => s.trim()) : undefined,
    opening_hours: t.opening_hours,
    osm_id: `osm-${el.type}-${el.id}`,
    notes: `OSM diet:vegan=only (${el.type} ${el.id})`,
  })
}

console.log(`\nResults:`)
console.log(`  Skip (source_id match):  ${skipBySourceId.length}`)
console.log(`  Skip (name match):       ${skipByName.length}`)
console.log(`  New candidates:          ${candidates.length}`)

// Per-city breakdown
const byCity = {}
for (const c of candidates) byCity[c.city] = (byCity[c.city] || 0) + 1
console.log('\nNew candidates by city (top 30):')
Object.entries(byCity).sort((a,b)=>b[1]-a[1]).slice(0,30).forEach(([c,n]) => console.log(`  ${c.padEnd(28)} ${n}`))

const outDir = '/Users/antonkravchuk/sidep/Cleareds/plantspack/scripts/seo-out/germany-osm-gap-2026-05-19'
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(`${outDir}/candidates.json`, JSON.stringify(candidates, null, 2))
fs.writeFileSync(`${outDir}/skip-by-name.txt`, skipByName.join('\n'))
console.log(`\n✓ Wrote ${candidates.length} candidates → ${outDir}/candidates.json`)
