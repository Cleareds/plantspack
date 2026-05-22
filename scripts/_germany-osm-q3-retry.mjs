// Retry Q3 (central Germany incl. Frankfurt) with smaller cells
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Q3 was 49.22,5.87,51.165,10.455 — split into 2x2
const CELLS = [
  '49.22,5.87,50.19,8.16',
  '49.22,8.16,50.19,10.455',
  '50.19,5.87,51.165,8.16',
  '50.19,8.16,51.165,10.455',
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

const elements = []
for (const bbox of CELLS) {
  process.stdout.write(`  ${bbox}: `)
  let ok = false
  for (let a = 0; a < 3 && !ok; a++) {
    try {
      const j = JSON.parse(await fetchOverpass(queryFor(bbox)))
      console.log(`${j.elements.length} elements`)
      elements.push(...j.elements); ok = true
    } catch (e) { process.stdout.write(`retry... `); await new Promise(r=>setTimeout(r,5000)) }
  }
  if (!ok) console.log('FAIL')
  await new Promise(r=>setTimeout(r,3000))
}

const existingIds = new Set()
let from = 0
while (true) {
  const { data } = await sb.from('places').select('source_id').eq('country','Germany').not('source_id','is',null).range(from, from+999)
  if (!data?.length) break
  for (const r of data) if (r.source_id) existingIds.add(r.source_id)
  if (data.length<1000) break; from+=1000
}
const norm = (s)=>(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim()
const nameIdx = new Map()
from = 0
while (true) {
  const { data } = await sb.from('places').select('name,city').eq('country','Germany').is('archived_at',null).range(from, from+999)
  if (!data?.length) break
  for (const r of data) { const c=r.city||''; if (!nameIdx.has(c)) nameIdx.set(c,new Set()); nameIdx.get(c).add(norm(r.name)) }
  if (data.length<1000) break; from+=1000
}
const cityAlias = (raw) => ({ 'München':'Munich','Köln':'Cologne','Nürnberg':'Nuremberg','Frankfurt am Main':'Frankfurt' })[raw] || raw
const NON_DE_COUNTRIES = new Set(['CH','AT','CZ','LU','NL','FR','BE','PL','DK'])
const NON_DE_CITIES = new Set(['Strasbourg','Mulhouse','Colmar','Metz','Nancy','Luxembourg','Basel'])

const candidates = []
for (const el of elements) {
  const id = `osm-${el.type}-${el.id}`
  if (existingIds.has(id)) continue
  const t = el.tags || {}
  const name = t.name || t['name:en'] || t['name:de']
  if (!name) continue
  if (NON_DE_COUNTRIES.has((t['addr:country']||'').toUpperCase())) continue
  const cityRaw = t['addr:city'] || t['addr:suburb']
  if (!cityRaw) continue
  if (NON_DE_CITIES.has(cityRaw)) continue
  const city = cityAlias(cityRaw)
  if ((nameIdx.get(city)||new Set()).has(norm(name))) continue
  const street = t['addr:street']
  const hno = t['addr:housenumber']
  const postcode = t['addr:postcode']
  candidates.push({
    name, city, country: 'Germany', vegan_level: 'fully_vegan',
    address: [street && hno ? `${street} ${hno}` : street, postcode, city, 'Germany'].filter(Boolean).join(', '),
    latitude: el.lat || el.center?.lat,
    longitude: el.lon || el.center?.lon,
    website: t.website || t['contact:website'],
    phone: t.phone || t['contact:phone'],
    cuisine_types: t.cuisine ? t.cuisine.split(';').map(s=>s.trim()) : undefined,
    opening_hours: t.opening_hours,
    notes: `OSM diet:vegan=only (${el.type} ${el.id}) [Q3 retry]`,
  })
}
console.log(`\nQ3-retry new candidates: ${candidates.length}`)
const byCity = {}; for (const c of candidates) byCity[c.city]=(byCity[c.city]||0)+1
Object.entries(byCity).sort((a,b)=>b[1]-a[1]).forEach(([c,n])=>console.log(`  ${c.padEnd(28)} ${n}`))
fs.writeFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/scripts/seo-out/germany-osm-gap-q3-2026-05-19/candidates.json',
  JSON.stringify(candidates,null,2))
console.log('✓ Wrote candidates.json')
