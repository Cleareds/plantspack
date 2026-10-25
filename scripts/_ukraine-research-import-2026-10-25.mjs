// Ukraine research import (2026-10-25).
//   tier A -> places (live), tier B -> place_staging drafts (raw.draft=true),
//   corrections -> place_corrections research items (proposed_action).
// Source data: reports/ukraine-research-2026-10-25/ukraine-places-2026-10-25.csv
// Usage: node scripts/_ukraine-research-import-2026-10-25.mjs [--apply]
// CLI never sets is_verified or admin_review (CLAUDE.md). Rollback: delete rows with source = TAG.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const APPLY = process.argv.includes('--apply')
const TAG = 'ukraine-research-2026-10-25'
const DIR = 'reports/ukraine-research-2026-10-25'
const ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

function parseCsv(text) {
  const rows = []; let row = []; let f = ''; let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++ } else if (c === '"') q = false; else f += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(f); f = '' }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = '' }
    else if (c !== '\r') f += c
  }
  if (f || row.length) { row.push(f); rows.push(row) }
  const [h, ...body] = rows
  return body.filter(r => r.length > 1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])))
}

const rows = parseCsv(fs.readFileSync(`${DIR}/ukraine-places-2026-10-25.csv`, 'utf8'))
const A = rows.filter(r => r.tier.startsWith('A'))
const B = rows.filter(r => r.tier.startsWith('B'))
const osmLeads = JSON.parse(fs.readFileSync(`${DIR}/osm-leads-not-in-db.json`, 'utf8'))

const cityFix = { 'Sheptytskyi (Chervonohrad) area': 'Sheptytskyi', Zhornyska: 'Zhornyska' }
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function nominatim(q) {
  await sleep(1100)
  const u = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ua&q=${encodeURIComponent(q)}`
  const res = await fetch(u, { headers: { 'User-Agent': 'PlantsPack-import/1.0 (plantspack.com)' } }).catch(() => null)
  const j = res?.ok ? await res.json().catch(() => []) : []
  return j[0] ? { lat: +j[0].lat, lng: +j[0].lon } : null
}
const MANUAL = { 'Vegetus Kyiv Obolon': { lat: 50.5130039, lng: 30.4972945 }, 'Animal Rescue Kharkiv (ARK)': { lat: 50.0289937, lng: 36.2251219 } }
async function locate(r) {
  if (MANUAL[r.name]) return { ...MANUAL[r.name], precision: 'address' }
  if (r.latitude && r.longitude) return { lat: +r.latitude, lng: +r.longitude, precision: 'source' }
  const osm = osmLeads.find(o => o.name && r.name_local && o.name === r.name_local)
  if (osm) return { lat: osm.lat, lng: osm.lon, precision: 'osm' }
  const city = cityFix[r.city] ?? r.city
  const addr = (r.address || '').replace(/\(.*?\)/g, '').split(' or ')[0].trim()
  if (addr) { const g = await nominatim(`${addr}, ${city}`); if (g) return { ...g, precision: 'address' } }
  const g = await nominatim(`${city}, Ukraine`)
  return g ? { ...g, precision: 'city' } : null
}

const sources = r => (r.sources || '').split(' ; ').filter(Boolean)
const instagram = r => r.instagram ? r.instagram.replace('://instagram.com', '://www.instagram.com') : null
const facebook = r => r.facebook || null

// ---- dedupe guard against live rows (name in same city) ----
const { data: live } = await sb.from('places').select('id, slug, name, city').eq('country', 'Ukraine').is('archived_at', null).limit(1000)
const norm = s => (s || '').toLowerCase().replace(/[^a-zа-яіїєґ0-9]/g, '')
const isDup = r => live.find(p => norm(p.name) === norm(r.name) && norm(p.city).startsWith(norm(r.city).slice(0, 4)))

console.log(`A ${A.length}, B ${B.length}, apply=${APPLY}`)
const out = { places: [], drafts: [], corrections: [], skipped: [] }

for (const r of A) {
  if (isDup(r)) { out.skipped.push(`${r.name}: already live as ${isDup(r).slug}`); continue }
  const loc = await locate(r)
  if (!loc) { out.skipped.push(`${r.name}: no location`); continue }
  const org = ['organisation', 'other'].includes(r.category)
  out.places.push({
    name: r.name, city: cityFix[r.city] ?? r.city, country: 'Ukraine',
    address: r.address || r.city, latitude: loc.lat, longitude: loc.lng,
    category: r.category, subcategory: r.subcategory || null,
    vegan_level: org ? null : r.vegan_level_import,
    website: r.website || instagram(r) || facebook(r),
    description: r.description || null,
    source: TAG, verification_method: TAG, verification_level: 2, is_verified: false,
    tags: [TAG, `geo:${loc.precision}`], created_by: ADMIN,
  })
}

for (const r of B) {
  const loc = await locate(r)
  if (!loc) { out.skipped.push(`${r.name}: no location`); continue }
  out.drafts.push({
    source: TAG, source_id: `${norm(r.name)}-${norm(r.city)}`.slice(0, 120),
    name: r.name, latitude: loc.lat, longitude: loc.lng,
    city: cityFix[r.city] ?? r.city, country: 'Ukraine', address: r.address || null,
    website: r.website || null, categories: [r.category, r.subcategory].filter(Boolean),
    vegan_level: r.vegan_level_import || null,
    vegan_evidence: r.vegan_evidence ? [{ rule: 'research', match: r.vegan_evidence.slice(0, 500) }] : [],
    decision: 'needs_review', decision_reason: r.tier_reason.slice(0, 300),
    raw: {
      draft: true, geo_precision: loc.precision, name_local: r.name_local || null,
      category: r.category || 'eat', subcategory: r.subcategory || null,
      status: r.status || null, status_evidence: r.status_evidence || null, confidence: r.confidence || null,
      instagram: instagram(r), facebook: facebook(r), description: r.description || null,
      sources: sources(r), notes: r.notes || null, db_match: r.db_match || null,
    },
  })
}

// ---- corrections -> research review items ----
const { data: allUa } = await sb.from('places').select('id, slug').eq('country', 'Ukraine').limit(1000)
const bySlug = Object.fromEntries(allUa.map(p => [p.slug, p]))
const corr = parseCsv(fs.readFileSync(`${DIR}/ukraine-corrections-2026-10-25.csv`, 'utf8'))
for (const c of corr) {
  // superseded by later user-checked items for the same rows
  if (c.found_by === 'kyiv' && ['green-13-kyiv', 'chocho-vegan-kyiv'].includes(c.slug)) continue
  const slugs = c.slug.split(/[\s/,()+]+/).filter(s => bySlug[s])
  if (!slugs.length) { out.skipped.push(`correction ${c.slug}: no matching place`); continue }
  out.corrections.push({
    place_id: bySlug[slugs[0]].id, user_id: ADMIN, status: 'pending',
    note: `CLI-REVIEW ${TAG}: ${c.detail}`.slice(0, 1000),
    corrections: { proposed_action: `ukraine_${c.issue.replace(/\W+/g, '_')}`, slugs, source: c.source, found_by: c.found_by },
  })
}

console.log(`places ${out.places.length}, drafts ${out.drafts.length}, corrections ${out.corrections.length}`)
console.log('geo precision:', JSON.stringify([...out.places.map(p => p.tags[1]), ...out.drafts.map(d => 'geo:' + d.raw.geo_precision)].reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {})))
out.skipped.forEach(s => console.log('SKIP', s))
fs.writeFileSync(`${DIR}/import-plan.json`, JSON.stringify(out, null, 1))
if (!APPLY) process.exit(0)

const { data: ins, error: e1 } = await sb.from('places').insert(out.places).select('id, slug, name')
if (e1) throw e1
console.log('inserted places', ins.length)
const { error: e2 } = await sb.from('place_staging').upsert(out.drafts, { onConflict: 'source,source_id' })
if (e2) throw e2
console.log('upserted drafts', out.drafts.length)
const { error: e3 } = await sb.from('place_corrections').insert(out.corrections)
if (e3) throw e3
console.log('queued corrections', out.corrections.length)
fs.writeFileSync(`${DIR}/import-result.json`, JSON.stringify({ places: ins }, null, 1))
for (const p of ins) await fetch('https://www.plantspack.com/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.REVALIDATE_SECRET}` }, body: JSON.stringify({ place_id: p.id }) }).catch(() => {})
