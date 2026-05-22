// Retry the OSM-gap candidates with proper umlaut/English city normalization.
// Reads original candidates, applies smart city mapping, promotes existing or imports new.
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const TAG = 'germany-osm-retry-2026-05-19'
const NOW = new Date().toISOString()
const candidates = JSON.parse(fs.readFileSync('/Users/antonkravchuk/sidep/Cleareds/plantspack/scripts/seo-out/germany-osm-gap-2026-05-19/candidates.json'))

// City canonicalization: OSM raw → DB canonical
// Major German cities are stored in DB in their canonical form (ASCII or English)
function canonCity(raw) {
  const map = {
    'München':'Munich','Köln':'Cologne','Nürnberg':'Nuremberg',
    'Frankfurt am Main':'Frankfurt','Frankfurt (Oder)':'Frankfurt (Oder)',
    'Lübeck':'Lubeck','Göttingen':'Gottingen','Lüneburg':'Luneburg',
    'Möhringen':'Mohringen','Mössingen':'Mossingen','Mülheim-Kärlich':'Mulheim-Karlich',
    'Gießen':'Giessen','Mülheim an der Ruhr':'Mulheim an der Ruhr',
    'Tübingen':'Tubingen','Saarbrücken':'Saarbrucken','Osnabrück':'Osnabruck',
    'Bückeburg':'Buckeburg','Lörrach':'Lorrach','Görlitz':'Gorlitz',
    'Halle (Saale)':'Halle (Saale)','Halle':'Halle (Saale)',
  }
  return map[raw] || raw
}

const ascii = (s) => (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss')
const norm = (s) => ascii(s).toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim()

// Per-city dedup lookup, key by ASCII-normalized city
const cache = new Map()
async function fetchOurs(city) {
  const k = ascii(city).toLowerCase()
  if (cache.has(k)) return cache.get(k)
  // Try canonical first, then both ASCII and umlaut variants
  const rows = []
  const tryCities = [city, canonCity(city), ascii(city)]
  for (const c of [...new Set(tryCities)]) {
    let from = 0
    while (true) {
      const { data } = await sb.from('places').select('id,name,city,slug,vegan_level,archived_at,verification_method').eq('country','Germany').eq('city',c).range(from,from+999)
      if (!data?.length) break
      for (const r of data) rows.push(r)
      if (data.length<1000) break; from+=1000
    }
  }
  cache.set(k, rows)
  return rows
}

const order = { vegan_options: 1, vegan_friendly: 2, mostly_vegan: 3, fully_vegan: 4 }
const skipped = [], promotions = [], unarchive = [], toImport = []

for (const c of candidates) {
  const candCity = canonCity(c.city)
  const ours = await fetchOurs(c.city)
  const cn = norm(c.name)
  const cnStrip = cn.replace(new RegExp(`\\b${ascii(c.city).toLowerCase()}\\b|\\bvegan\\b`,'g'),'').trim()
  // Also try slug-based match
  const candSlugBase = norm(c.name).replace(/\s+/g,'-')
  const hit = ours.find(r => {
    const rn = norm(r.name)
    if (rn === cn) return true
    if (cnStrip.length >= 5 && (rn.includes(cnStrip) || cnStrip.includes(rn))) return true
    if (r.slug.startsWith(candSlugBase + '-') || r.slug === candSlugBase) return true
    return false
  })
  if (hit) {
    if (hit.archived_at) {
      // archived dupe — leave alone (respect "never delete" rule), but flag
      skipped.push({ c: c.name, db: hit.name, city: c.city, l: hit.vegan_level, archived: true })
    } else if (order[c.vegan_level] > order[hit.vegan_level]) {
      promotions.push({ id: hit.id, name: hit.name, city: hit.city, from: hit.vegan_level, to: c.vegan_level })
    } else {
      skipped.push({ c: c.name, db: hit.name, city: c.city, l: hit.vegan_level })
    }
  } else {
    toImport.push({ ...c, city: candCity })
  }
}

console.log(`Skipped (already in DB, same/higher level): ${skipped.length}`)
skipped.filter(s => !s.archived).forEach(s => console.log(`  [${s.city}] ${s.c} → ${s.db} (${s.l})`))
const archived = skipped.filter(s => s.archived)
console.log(`\nSkipped (archived dupes — not touching): ${archived.length}`)
archived.forEach(s => console.log(`  [${s.city}] ${s.c} → ${s.db} (${s.l}) [ARCHIVED]`))
console.log(`\nPromotions: ${promotions.length}`)
promotions.forEach(p => console.log(`  [${p.city}] ${p.name}: ${p.from} → ${p.to}`))
console.log(`\nTo import (truly new): ${toImport.length}\n`)
toImport.forEach(c => console.log(`  [${c.city}] ${c.name}`))

// Apply promotions
for (const p of promotions) {
  await sb.from('places').update({
    vegan_level: p.to, verification_method: TAG, last_verified_at: NOW
  }).eq('id', p.id)
}

// Run imports
const log = '/Users/antonkravchuk/sidep/Cleareds/plantspack/scripts/seo-out/germany-osm-gap-2026-05-19/retry-results.jsonl'
fs.writeFileSync(log, '')
let ok = 0, fail = 0
const codeFor = () => 'de'
for (let i = 0; i < toImport.length; i++) {
  const c = toImport[i]
  const payload = {
    name: c.name, city: c.city, country: 'Germany', country_code: 'de',
    category: 'eat', vegan_level: c.vegan_level, address: c.address,
    latitude: c.latitude, longitude: c.longitude,
    website: c.website, phone: c.phone, opening_hours: c.opening_hours,
    cuisine_types: c.cuisine_types, description: c.notes, tags: [TAG]
  }
  process.stdout.write(`\n  [${i+1}/${toImport.length}] ${c.city.padEnd(20)} ${c.name.slice(0,35).padEnd(35)} `)
  const r = await new Promise(resolve => {
    const child = spawn('npx', ['tsx', 'scripts/add-place.ts', '--imported', '--force-vegan-level'], { stdio:['pipe','pipe','pipe'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    child.stderr.on('data', () => {})
    child.stdin.write(JSON.stringify(payload)); child.stdin.end()
    const t = setTimeout(() => { child.kill('SIGTERM'); resolve({ ok:false }) }, 60000)
    child.on('exit', code => {
      clearTimeout(t)
      const succ = /Public URL/.test(out) && code === 0
      resolve({ ok: succ, slugConflict: /duplicate key.*idx_places_slug/.test(out) })
    })
  })
  if (r.ok) { ok++; process.stdout.write('✓') } else { fail++; process.stdout.write(r.slugConflict?'✗(slug)':'✗') }
  fs.appendFileSync(log, JSON.stringify({ ...c, ...r }) + '\n')
}
console.log(`\n\nDone. ${ok} imported, ${fail} failed`)
const { count: fv } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Germany').eq('vegan_level','fully_vegan').is('archived_at',null)
console.log(`Germany FV active: ${fv}`)
