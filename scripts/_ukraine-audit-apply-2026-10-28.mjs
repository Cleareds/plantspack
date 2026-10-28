// Apply the checked results of the 2026-10-28 Ukraine audit
// (research/plantspack_ukraine_audit_2026-10-28.json + automated review), re-verified in-session
// by WebSearch/WebFetch agents. Inputs (agent output, kept in reports/ukraine-audit/):
//   live-changes-result.json  -> accepted field changes + archive of closed places
//   drafts-{1,2,3}-result.json -> publish / reject / keep research drafts in place_staging
// CLI rules: no admin_review, no is_verified=true. Published drafts: verification_level 2.
// Dry-run by default; --apply writes. Rollback: reports/ukraine-audit/rollback-apply-2026-10-28.json
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const TAG = 'ukraine-audit-2026-10-28'
const DIR = 'reports/ukraine-audit'
const ADMIN_USER_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const live = JSON.parse(fs.readFileSync(`${DIR}/live-changes-result.json`, 'utf8'))
const drafts = [1, 2, 3].flatMap(i => JSON.parse(fs.readFileSync(`${DIR}/drafts-${i}-result.json`, 'utf8')))
const ALLOWED = ['address', 'phone', 'website', 'opening_hours', 'description', 'vegan_level', 'category', 'subcategory', 'latitude', 'longitude']
const noDash = v => typeof v === 'string' ? v.replace(/\s*—\s*/g, ' - ') : v
const rollback = { live: [], drafts: [], published: [] }
const now = new Date().toISOString()

// ---- 1. live places ----
const ids = live.map(p => p.place_id)
const { data: cur, error: e0 } = await sb.from('places').select('id,name,city,address,phone,website,opening_hours,description,vegan_level,category,subcategory,latitude,longitude,admin_notes,archived_at').in('id', ids)
if (e0) throw e0
const C = Object.fromEntries(cur.map(p => [p.id, p]))
const liveOps = []
for (const p of live) {
  const c = C[p.place_id]
  if (!c || c.archived_at) continue
  const upd = {}
  for (const [k, v] of Object.entries(p.accepted_changes || {})) if (ALLOWED.includes(k) && v != null && c[k] !== v) upd[k] = noDash(v)
  if (upd.category === 'organisation' || c.category === 'organisation') upd.vegan_level = null
  if (upd.vegan_level === null && c.vegan_level === null) delete upd.vegan_level
  if (p.archive) Object.assign(upd, { archived_at: now, archived_reason: `closed: ${p.operation_evidence}`.slice(0, 500) })
  if (!Object.keys(upd).length) continue
  const srcs = (p.sources || []).map(s => s.url).filter(u => !/happycow/i.test(u)).slice(0, 4).join(' ')
  upd.admin_notes = [c.admin_notes, `${TAG}: ${Object.keys(upd).join(',')} from ${srcs}`].filter(Boolean).join('\n').slice(0, 4000)
  liveOps.push({ id: c.id, before: c, upd })
}
// City labels: "Lviv Urban Hromada" -> "Lviv" for every live Ukraine row.
const { data: hrom } = await sb.from('places').select('id,name,city').eq('country', 'Ukraine').is('archived_at', null).ilike('city', '% Urban Hromada')
for (const h of hrom) {
  const op = liveOps.find(o => o.id === h.id)
  const city = h.city.replace(/ Urban Hromada$/, '')
  if (op) op.upd.city = city
  else liveOps.push({ id: h.id, before: h, upd: { city } })
}
for (const o of liveOps) console.log(`LIVE ${o.before.name}: ${JSON.stringify(o.upd).slice(0, 220)}`)

// ---- 2. drafts ----
const { data: st, error: e1 } = await sb.from('place_staging').select('*').in('id', drafts.map(d => d.staging_id))
if (e1) throw e1
const S = Object.fromEntries(st.map(r => [r.id, r]))
async function geocode(q) {
  await new Promise(r => setTimeout(r, 1100))
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ua&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': 'PlantsPack data-quality (plantspack.com)' } })
  const j = res.ok ? await res.json() : []
  return j[0] ? { lat: +j[0].lat, lng: +j[0].lon } : null
}
const draftOps = []
for (const d of drafts) {
  const row = S[d.staging_id]
  if (!row || row.imported_place_id || row.operator_action) continue
  const research = { verdict: d.verdict, confidence: d.confidence, operation_evidence: d.operation_evidence, vegan_evidence: d.vegan_evidence, suggested_vegan_level: d.vegan_level, sources: d.sources, notes: d.notes, at: '2026-10-28' }
  const raw = { ...row.raw, research_2026_10_28: research }
  if (d.verdict === 'publish') {
    let lat = d.latitude, lng = d.longitude, precision = 'source'
    if (lat == null && d.address) { const g = await geocode(d.address); if (g) ({ lat, lng } = g, precision = 'nominatim') }
    if (lat == null) { lat = row.latitude; lng = row.longitude; precision = row.raw?.geo_precision || 'city' }
    draftOps.push({ kind: 'publish', row, raw, d, lat, lng, precision })
  } else if (['reject_closed', 'reject_not_vegan', 'duplicate_of_live'].includes(d.verdict) && d.confidence !== 'low') {
    draftOps.push({ kind: 'reject', row, raw, d })
  } else {
    draftOps.push({ kind: 'note', row, raw, d })
  }
}
for (const o of draftOps.filter(o => o.kind !== 'note')) console.log(`DRAFT ${o.kind} ${o.d.name} (${o.d.city}) ${o.d.vegan_level || ''} ${o.kind === 'publish' ? `@${o.lat},${o.lng} [${o.precision}]` : o.d.verdict}`)
console.log(`live updates ${liveOps.length}; drafts publish ${draftOps.filter(o => o.kind === 'publish').length}, reject ${draftOps.filter(o => o.kind === 'reject').length}, notes ${draftOps.filter(o => o.kind === 'note').length}`)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }

rollback.live = liveOps.map(o => ({ id: o.id, before: o.before }))
rollback.drafts = draftOps.map(o => ({ id: o.row.id, raw: o.row.raw, decision: o.row.decision, decision_reason: o.row.decision_reason }))
fs.writeFileSync(`${DIR}/rollback-apply-2026-10-28.json`, JSON.stringify(rollback, null, 1))
for (const o of liveOps) {
  const { error } = await sb.from('places').update(o.upd).eq('id', o.id)
  if (error) throw new Error(`${o.before.name}: ${error.message}`)
}
for (const o of draftOps) {
  const { row, raw, d } = o
  if (o.kind === 'publish') {
    const isOrg = d.category === 'organisation'
    const { data: ins, error } = await sb.from('places').insert({
      name: d.name.slice(0, 200),
      address: (d.address || d.city).slice(0, 300),
      city: d.city, country: 'Ukraine',
      latitude: o.lat, longitude: o.lng,
      category: d.category, subcategory: d.subcategory || null,
      vegan_level: isOrg ? null : d.vegan_level,
      website: d.website || null, phone: d.phone || null, opening_hours: d.opening_hours || null,
      description: noDash(d.description) || null,
      source: row.source, source_id: row.source_id,
      tags: [row.source, TAG, 'draft-published', `geo:${o.precision}`],
      verification_level: 2, verification_method: TAG, verification_status: 'approved', is_verified: false,
      admin_notes: `${TAG}: published from research draft. ${d.operation_evidence} | ${d.vegan_evidence}`.slice(0, 2000),
      created_by: ADMIN_USER_ID,
    }).select('id, slug').single()
    if (error) throw new Error(`${d.name}: ${error.message}`)
    rollback.published.push(ins)
    const r = await sb.from('place_staging').update({ raw, operator_action: 'approved', operator_decided_at: now, imported_place_id: ins.id, updated_at: now }).eq('id', row.id)
    if (r.error) throw r.error
    console.log(`published /place/${ins.slug}`)
  } else if (o.kind === 'reject') {
    const reason = `${TAG} ${d.verdict}: ${d.verdict === 'duplicate_of_live' ? d.duplicate_of : (d.operation_evidence + ' | ' + d.vegan_evidence)}`.slice(0, 300)
    const r = await sb.from('place_staging').update({ raw, operator_action: 'rejected', operator_decided_at: now, decision_reason: reason, updated_at: now }).eq('id', row.id)
    if (r.error) throw r.error
  } else {
    const r = await sb.from('place_staging').update({ raw, updated_at: now }).eq('id', row.id)
    if (r.error) throw r.error
  }
}
fs.writeFileSync(`${DIR}/rollback-apply-2026-10-28.json`, JSON.stringify(rollback, null, 1))
console.log('done')
