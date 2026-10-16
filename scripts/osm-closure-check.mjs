// OSM closure check (data-quality 6 + 10, 2026-10-15). FLAG ONLY by default.
//
// For every live place with an osm_ref, read the CURRENT OSM object (Overpass, by id) and
// classify it:
//   ok        object exists and still looks like a business
//   disused   lifecycle tags (disused:/was:/abandoned:/closed:...) and no main key left
//   renamed   object exists but its name shares no word with ours (a new tenant?)
//   gone      object deleted from OSM. Then look for a replacement within 120 m with a
//             matching name (mappers often delete a node and redraw the venue as a way):
//               relink  -> one clear replacement: our osm_ref is stale, not a closure
//               gone    -> no replacement: closure candidate
//
// Nothing is archived. Output: reports/osm-closure/<date>[-<country>].json.
//   --country=Belgium     one country only (monthly per-country runs)
//   --fully-vegan         only vegan_level = fully_vegan
//   --relink              write the replacement osm_ref for "relink" rows (stale link fix,
//                         not a closure; skipped if another place already holds that ref)
//   --file                file "gone"/"disused" rows into place_corrections for
//                         /data-quality Research Review (proposed_action archive_or_keep)
// Never Levenshtein venue names: token sets only.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=')
const has = k => process.argv.includes(`--${k}`)
const COUNTRY = arg('country')
const FV = has('fully-vegan')
const DATE = new Date().toISOString().slice(0, 10)
const AUDIT = `osm-closure-${DATE}`
const IMPORT_ACCOUNT = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
// Main instance first; it often answers 502 under load, so fall back to public mirrors.
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
const UA = 'PlantsPack data-quality (plantspack.com)'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function overpass(query) {
  for (let attempt = 1; attempt <= 9; attempt++) {
    const url = OVERPASS[(attempt - 1) % OVERPASS.length]
    try {
      const res = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA } })
      if (res.ok) return (await res.json()).elements
      console.error(`overpass ${new URL(url).host} ${res.status}, retry ${attempt}`)
    } catch (e) { console.error(`overpass ${new URL(url).host} ${e.message}, retry ${attempt}`) }
    await sleep(Math.ceil(attempt / OVERPASS.length) * 15000)
  }
  throw new Error('overpass failed 9 times')
}
// Per-batch cache, so a crash or a rerun the same day does not refetch finished batches.
const CACHE = `reports/osm-closure/.cache-${new Date().toISOString().slice(0, 10)}`
fs.mkdirSync(CACHE, { recursive: true })
async function cached(key, query) {
  const f = `${CACHE}/${key}.json`
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'))
  const els = await overpass(query)
  fs.writeFileSync(f, JSON.stringify(els))
  await sleep(2000)
  return els
}

const STOP = new Set(['the', 'le', 'la', 'el', 'il', 'de', 'het', 'een', 'a', 'an', 'and', 'of', 'restaurant', 'restaurante',
  'ristorante', 'restoran', 'cafe', 'caffe', 'coffee', 'bar', 'bistro', 'kitchen', 'house', 'vegan', 'vegano', 'vegana',
  'vegetarian', 'vegetariano', 'vegetariana', 'gmbh', 'ltd', 'inc', 'llc', 'co'])
const tokens = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
  .replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(t => t && !STOP.has(t))
function sameName(ours, theirs) {
  const A = new Set(tokens(ours)), B = new Set(tokens(theirs))
  if (!A.size || !B.size) return (ours || '').trim().toLowerCase() === (theirs || '').trim().toLowerCase()
  const shared = [...A].filter(t => B.has(t)).length
  return shared === Math.min(A.size, B.size)
}
const overlaps = (ours, theirs) => {
  const A = new Set(tokens(ours)), B = tokens(theirs)
  return !A.size || !B.length || B.some(t => A.has(t))
}
const MAIN = ['amenity', 'shop', 'craft', 'tourism', 'leisure', 'office', 'healthcare', 'club']
const LIFECYCLE = /^(disused|was|abandoned|closed|demolished|removed|razed|former):/
function lifecycle(tags) {
  if (MAIN.some(k => tags[k] && tags[k] !== 'vacant')) return tags['disused'] === 'yes' || /^(closed|off)$/i.test(tags.opening_hours || '')
  return Object.keys(tags).some(k => LIFECYCLE.test(k)) || tags.shop === 'vacant' || tags.amenity === 'vacant'
}
function distM(a, b, c, d) {
  const R = 6371000, r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r
  return Math.round(Math.sqrt(x * x + y * y) * R)
}

// 1. Places with an osm_ref (cursor by id; PostgREST caps reads at 1000).
const places = []
let last = '00000000-0000-0000-0000-000000000000'
for (;;) {
  let q = sb.from('places').select('id,name,city,country,latitude,longitude,vegan_level,osm_ref,created_by,review_count,admin_notes')
    .is('archived_at', null).not('osm_ref', 'is', null).gt('id', last).order('id').limit(1000)
  if (COUNTRY) q = q.eq('country', COUNTRY)
  if (FV) q = q.eq('vegan_level', 'fully_vegan')
  const { data, error } = await q
  if (error) throw error
  places.push(...data)
  if (data.length < 1000) break
  last = data.at(-1).id
}
console.log(`places with osm_ref: ${places.length}`)

// 2. Current OSM objects, by id: OSM API multi-fetch (reliable; Overpass often 5xx under load).
//    Deleted elements come back with visible=false. An id that never existed makes the whole
//    request 404, so a 404 batch is split in half until the bad id is isolated.
const cur = {}
async function osmApi(type, ids) {
  if (!ids.length) return []
  const f = `${CACHE}/api-${type}-${ids[0]}-${ids.length}.json`
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'))
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(`https://api.openstreetmap.org/api/0.6/${type}s.json?${type}s=${ids.join(',')}`, { headers: { 'User-Agent': UA } })
    await sleep(1000)
    if (res.ok) { const els = (await res.json()).elements; fs.writeFileSync(f, JSON.stringify(els)); return els }
    if (res.status === 404) {
      if (ids.length === 1) return []
      const h = ids.length >> 1
      return [...await osmApi(type, ids.slice(0, h)), ...await osmApi(type, ids.slice(h))]
    }
    console.error(`osm api ${res.status}, retry ${attempt}`)
    await sleep(attempt * 10000)
  }
  throw new Error('osm api failed 5 times')
}
const byType = { node: [], way: [], relation: [] }
for (const p of places) { const [t, id] = p.osm_ref.split(':'); byType[t]?.push(id) }
let done = 0
for (const [t, ids] of Object.entries(byType)) {
  const uniq = [...new Set(ids)].sort()
  for (let i = 0; i < uniq.length; i += 400) {
    const els = await osmApi(t, uniq.slice(i, i + 400))
    for (const e of els) if (e.visible !== false) cur[`${e.type}:${e.id}`] = e.tags || {}
    done += Math.min(400, uniq.length - i)
    process.stdout.write(`\r  osm api ${done}/${places.length}`)
  }
}
console.log()

const rows = []
for (const p of places) {
  const t = cur[p.osm_ref]
  if (!t) { rows.push({ p, status: 'gone' }); continue }
  if (lifecycle(t)) { rows.push({ p, status: 'disused', osm_name: t.name || null, tags: t }); continue }
  if (t.name && !overlaps(p.name, t.name) && !overlaps(p.name, t['old_name']) && !overlaps(p.name, t['name:en']))
    rows.push({ p, status: 'renamed', osm_name: t.name, tags: t })
}

// 3. Replacement search for gone objects, 40 places per Overpass query.
const gone = rows.filter(r => r.status === 'gone' && r.p.latitude && r.p.longitude)
for (let i = 0; i < gone.length; i += 40) {
  const slice = gone.slice(i, i + 40)
  const q = slice.map(r => `nwr(around:120,${r.p.latitude},${r.p.longitude})[name];`).join('')
  let els
  try { els = await cached('near-' + slice[0].p.id + '-' + slice.length, `[out:json][timeout:300];(${q});out tags center;`) }
  catch { for (const r of slice) r.note = 'replacement search failed (Overpass down) - rerun'; continue }
  for (const r of slice) {
    const cands = els.filter(e => {
      const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon
      if (lat == null || distM(r.p.latitude, r.p.longitude, lat, lon) > 120) return false
      return [e.tags?.name, e.tags?.['name:en'], e.tags?.old_name].some(n => n && sameName(r.p.name, n))
    })
    const uniq = [...new Map(cands.map(e => [`${e.type}:${e.id}`, e])).values()]
    if (uniq.length === 1) {
      const e = uniq[0]
      r.status = lifecycle(e.tags) ? 'disused' : 'relink'
      r.new_ref = `${e.type}:${e.id}`; r.osm_name = e.tags.name; r.tags = e.tags
    } else if (uniq.length > 1) r.note = `${uniq.length} same-name objects nearby`
  }
  process.stdout.write(`\r  replacement search ${Math.min(i + 40, gone.length)}/${gone.length}`)
}
console.log()

const count = s => rows.filter(r => r.status === s).length
console.log(`ok ${places.length - rows.length}  relink ${count('relink')}  gone ${count('gone')}  disused ${count('disused')}  renamed ${count('renamed')}`)
fs.mkdirSync('reports/osm-closure', { recursive: true })
const file = `reports/osm-closure/${DATE}${COUNTRY ? '-' + COUNTRY.replace(/\W+/g, '_') : ''}${FV ? '-fv' : ''}.json`
fs.writeFileSync(file, JSON.stringify(rows.map(r => ({
  id: r.p.id, name: r.p.name, city: r.p.city, country: r.p.country, vegan_level: r.p.vegan_level,
  osm_ref: r.p.osm_ref, status: r.status, new_ref: r.new_ref || null, osm_name: r.osm_name || null, note: r.note || null,
  person_added: r.p.created_by !== IMPORT_ACCOUNT, review_count: r.p.review_count || 0,
})), null, 1))
console.log('report:', file)

// 4. Optional writes.
if (has('relink')) {
  const relink = rows.filter(r => r.status === 'relink')
  const rollback = []
  let n = 0
  for (const r of relink) {
    const { data: taken } = await sb.from('places').select('id').eq('osm_ref', r.new_ref).limit(1)
    if (taken?.length) { r.note = `new ref ${r.new_ref} already on ${taken[0].id}`; continue }
    const { error } = await sb.from('places').update({
      osm_ref: r.new_ref,
      admin_notes: `${r.p.admin_notes ? r.p.admin_notes + '\n' : ''}[${AUDIT}] osm_ref ${r.p.osm_ref} deleted in OSM; same venue re-mapped as ${r.new_ref}`,
    }).eq('id', r.p.id)
    if (error) { console.error(r.p.id, error.message); continue }
    rollback.push({ id: r.p.id, osm_ref: r.p.osm_ref, admin_notes: r.p.admin_notes }); n++
  }
  fs.writeFileSync(file.replace('.json', '-relink-rollback.json'), JSON.stringify(rollback, null, 1))
  console.log(`RELINKED ${n} of ${relink.length}`)
}
if (has('file')) {
  const flag = rows.filter(r => r.status === 'gone' || r.status === 'disused')
  // Skip a place that already has an osm-closure item for the same OSM object and status, in any
  // state: a human who chose "keep" must not get the same flag again next month.
  const seen = new Set()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('place_corrections').select('place_id,corrections').like('corrections->>audit', 'osm-closure-%').order('id').range(from, from + 999)
    if (error) throw error
    for (const x of data) seen.add(`${x.place_id}|${x.corrections?.osm_ref}|${x.corrections?.osm_status}`)
    if (data.length < 1000) break
  }
  const ins = flag.filter(r => !seen.has(`${r.p.id}|${r.p.osm_ref}|${r.status}`)).map(r => ({
    place_id: r.p.id, user_id: IMPORT_ACCOUNT, status: 'pending',
    corrections: { proposed_action: 'archive_or_keep', audit: AUDIT, osm_status: r.status, osm_ref: r.p.osm_ref },
    note: `CLI-REVIEW ${AUDIT}: ${r.p.name} (${r.p.city || '?'}, ${r.p.country}) - ${r.status === 'gone'
      ? `OSM object ${r.p.osm_ref} was deleted and no same-name object is within 120 m`
      : `OSM object ${r.new_ref || r.p.osm_ref} is tagged as closed (disused/was:)`}. OSM alone is not proof of closure. Decide archive vs keep.`,
  }))
  for (let i = 0; i < ins.length; i += 200) {
    const { error } = await sb.from('place_corrections').insert(ins.slice(i, i + 200))
    if (error) throw error
  }
  console.log(`FILED ${ins.length} (skipped ${flag.length - ins.length} flagged before)`)
}
