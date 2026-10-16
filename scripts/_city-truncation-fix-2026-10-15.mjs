// Data-quality 4b (2026-10-15): city labels with a trailing "s" cut off (Worms -> Worm, Totnes -> Totne).
// For each pair of labels X / Xs in one country, every live row on both labels is reverse-geocoded
// (OSM Nominatim, 1 req/s, cached in reports/dq-2026-10-15/trunc-geo.json) and gets the label its
// coordinates name. The direction is not fixed: "Stockholms" is wrong, "Worm" is wrong, and
// Edmond (OK) / Edmonds (WA) are both real towns, so a name rule cannot decide.
// Rows whose coordinates name neither label are held and listed. Dry-run unless --apply.
// Rollback: reports/dq-2026-10-15/rollback-city-trunc-2026-10-15.json
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const TAG = 'city-trunc-2026-10-15'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
// Labels whose canonical form on the site is a different name (English exonym already in use).
const CANON = { 'Sweden|Goteborg': 'Gothenburg', 'Sweden|Goteborgs': 'Gothenburg' }

const rows = JSON.parse(fs.readFileSync('reports/dq-2026-10-15/cities.json', 'utf8'))
const n = {}
for (const r of rows) if (r.city) { const k = r.country + '|' + r.city; n[k] = (n[k] || 0) + 1 }
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
// [country, short, long]: labels X / Xs both in use ...
const pairs = Object.keys(n).filter(k => n[k + 's']).map(k => [...k.split('|'), k.split('|')[1] + 's'])
// ... plus labels with no "+s" partner where the OSM object's addr:city is the label + "s"
// (Manassa -> Manassas, Bora -> Borås). Tags from today's osm-closure-check cache.
const OSMC = 'reports/osm-closure/.cache-2026-10-15/'
const tags = {}
for (const f of fs.readdirSync(OSMC)) for (const e of JSON.parse(fs.readFileSync(OSMC + f, 'utf8'))) if (e.tags) tags[e.type + ':' + e.id] = e.tags
const seen = new Set(pairs.map(p => p[0] + '|' + p[1]))
for (const p of JSON.parse(fs.readFileSync('reports/dq-2026-10-15/live.json', 'utf8'))) {
  const a = tags[p.osm_ref]?.['addr:city']
  if (!a || !p.city || norm(a) !== norm(p.city) + 's' || seen.has(p.country + '|' + p.city)) continue
  seen.add(p.country + '|' + p.city)
  pairs.push([p.country, p.city, a.trim()])
}

const CACHE = 'reports/dq-2026-10-15/trunc-geo.json'
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {}
async function names(lat, lon) {
  const k = `${lat},${lon}`
  if (!cache[k]) {
    const out = []
    for (const lang of ['']) {
      await new Promise(r => setTimeout(r, 1100))
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat=${lat}&lon=${lon}${lang ? '&accept-language=' + lang : ''}`,
        { headers: { 'User-Agent': 'PlantsPack data-quality (plantspack.com)' } })
      const a = res.ok ? (await res.json()).address || {} : {}
      out.push(...['city', 'town', 'village', 'hamlet', 'municipality', 'suburb', 'city_district', 'borough', 'county'].map(f => a[f]).filter(Boolean))
    }
    cache[k] = [...new Set(out)]
    fs.writeFileSync(CACHE, JSON.stringify(cache))
  }
  return cache[k]
}
// Does a geocoded name equal the label (or the label + common suffixes like "Stockholms kommun")?
// 2 = exact name, 1 = "<label> kommun/municipality" (Stockholms kommun is the genitive of Stockholm).
const hit = (geo, label) => Math.max(0, ...geo.map(g => { const a = norm(g), b = norm(label); return a === b ? 2 : a === b + ' kommun' || a === b + ' municipality' ? 1 : 0 }))
// Short labels that are real places (Forest Hill, MD): never lengthened.
const KEEP_SHORT = new Set(['United States|Forest Hill', 'Sweden|Stockholm'])

const plan = [], held = []
for (const [country, short, long] of pairs) {
  for (const r of rows.filter(x => x.country === country && (x.city === short || x.city === long))) {
    const geo = await names(r.latitude, r.longitude)
    const s = hit(geo, short), l = hit(geo, long)
    let city = s > l ? short : l > s ? long : null
    // Geocode names a district, not the postal town (St Leonards for Hastings): a row on the
    // truncated label still takes the full one; a row already on the full label stays.
    if (!city && !s && !l && r.city === short && !KEEP_SHORT.has(`${country}|${short}`)) city = long
    if (city && CANON[`${country}|${city}`]) city = CANON[`${country}|${city}`]
    else if (!city && (CANON[`${country}|${r.city}`])) city = CANON[`${country}|${r.city}`]
    if (!city) { held.push({ r, geo }); continue }
    if (city !== r.city) plan.push({ r, city, geo })
  }
}
const t = {}
for (const p of plan) { const k = `${p.r.country}: ${p.r.city} -> ${p.city}`; t[k] = (t[k] || 0) + 1 }
console.log(`pairs ${pairs.length}  change ${plan.length}  held ${held.length}`)
console.log(Object.entries(t).map(([k, v]) => `  ${k} (${v})`).join('\n'))
console.log('--- held (coordinates name neither label)')
for (const h of held) console.log(`  ${h.r.id} ${h.r.country} | ${h.r.city} | ${h.r.address || ''} | geo: ${h.geo.join(', ')}`)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }

const ids = plan.map(p => p.r.id), before = []
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await sb.from('places').select('id,city,admin_notes,archived_at').in('id', ids.slice(i, i + 200))
  if (error) throw error
  before.push(...data)
}
fs.writeFileSync('reports/dq-2026-10-15/rollback-city-trunc-2026-10-15.json', JSON.stringify(before, null, 1))
const B = Object.fromEntries(before.map(p => [p.id, p]))
let done = 0
for (const p of plan) {
  const b = B[p.r.id]
  if (!b || b.archived_at || b.city !== p.r.city) continue
  const { error } = await sb.from('places').update({ city: p.city,
    admin_notes: `${b.admin_notes ? b.admin_notes.trimEnd() + '\n' : ''}[${TAG}] city "${p.r.city}" -> "${p.city}" (reverse geocode: ${p.geo.slice(0, 4).join(', ')})` }).eq('id', p.r.id)
  if (error) console.error(p.r.id, error.message); else done++
}
console.log(`APPLIED ${done}`)
