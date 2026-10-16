// Apply website-check verdicts (reports/label-check/verdict-*.json).
// Only high/medium confidence acts. low / unclear / wrong_site: no label change.
//   A (stored fully_vegan): confirmed -> verification_level 2; lower level -> demote;
//      no_vegan(high) / closed(high) -> archive.
//   B (vegetarian-named): level from site; fully_vegan only at high; no_vegan(high) -> archive
//      (vegetarian-only places do not belong); closed(high) -> archive.
// Never archives a place a person added (created_by != the 'admin' import account) or one with
// reviews: those are held for a human. Never sets admin_review / is_verified. Rollback: reports/label-check/rollback-<tag>.json
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const TAG = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'web-check-2026-10-14'
const FILES = process.argv.filter(a => a.endsWith('.json'))
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const Aq = new Set(JSON.parse(fs.readFileSync('reports/label-check/A-queue.json')).map(r => r.id))
const V = FILES.flatMap(f => JSON.parse(fs.readFileSync(f)))
const LEVELS = ['fully_vegan', 'mostly_vegan', 'vegan_friendly', 'vegan_options']
const rows = {}
const ids = V.map(v => v.id)
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await sb.from('places').select('id,name,slug,vegan_level,verification_level,verification_method,archived_at,archived_reason,admin_notes,tags,review_count,created_by').in('id', ids.slice(i, i + 200))
  if (error) throw error
  for (const r of data) rows[r.id] = r
}
// The bulk-import account. Places created by anyone else were added by a person.
const IMPORT_ACCOUNT = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const now = new Date().toISOString()
const plan = [], tally = {}, held = []
for (const v of V) {
  const r = rows[v.id]
  if (!r || r.archived_at) continue
  const sure = v.confidence === 'high' || v.confidence === 'medium'
  const note = `[${TAG}] site check: ${v.verdict} (${v.confidence}) - "${(v.evidence || '').slice(0, 160)}"`
  const tags = [...new Set([...(r.tags || []), TAG])]
  let upd = null, act = 'none'
  const protectedRow = (r.review_count || 0) > 0 || r.created_by !== IMPORT_ACCOUNT
  if (!sure) act = 'none'
  else if ((v.verdict === 'closed' || v.verdict === 'no_vegan') && v.confidence === 'high' && protectedRow)
    act = (r.review_count || 0) > 0 ? 'hold-has-reviews' : 'hold-added-by-person'
  else if (v.verdict === 'closed' && v.confidence === 'high') { upd = { archived_at: now, archived_reason: `closed: own website says so (${TAG})` }; act = 'archive-closed' }
  else if (v.verdict === 'no_vegan' && v.confidence === 'high') {
    if ((r.review_count || 0) > 0) act = 'hold-has-reviews'
    else { upd = { archived_at: now, archived_reason: `no vegan food on own website (${TAG})` }; act = 'archive-no-vegan' }
  }
  else if (LEVELS.includes(v.verdict)) {
    if (v.verdict === 'fully_vegan' && r.vegan_level !== 'fully_vegan' && v.confidence !== 'high') act = 'none'
    else if (v.verdict === r.vegan_level) { upd = { verification_level: Math.max(r.verification_level || 0, 2), verification_method: TAG }; act = 'confirm' }
    else { upd = { vegan_level: v.verdict, verification_level: 2, verification_method: TAG }; act = `${r.vegan_level}->${v.verdict}` }
  }
  if (act.startsWith('hold-')) held.push({ id: r.id, name: r.name, slug: r.slug, created_by: r.created_by, hold: act, ...v })
  tally[`${Aq.has(v.id) ? 'A' : 'B'} ${act}`] = (tally[`${Aq.has(v.id) ? 'A' : 'B'} ${act}`] || 0) + 1
  if (!upd) continue
  plan.push({ r, upd: { ...upd, tags, admin_notes: `${r.admin_notes ? r.admin_notes + '\n' : ''}${note}` }, act })
}
console.log(Object.entries(tally).sort())
for (const p of plan.filter(p => p.act.startsWith('archive') || p.act.includes('->')).slice(0, 40)) console.log(' ', p.act.padEnd(30), p.r.name)
// Held archive verdicts go to a human (file them into the Data Quality queue when the run ends).
if (APPLY && held.length) {
  const hf = 'reports/label-check/auto/held.json'
  const prev = fs.existsSync(hf) ? JSON.parse(fs.readFileSync(hf, 'utf8')) : []
  fs.writeFileSync(hf, JSON.stringify([...prev.filter(p => !held.some(h => h.id === p.id)), ...held], null, 1))
  console.log(`HELD for a human: ${held.length} -> ${hf}`)
}
if (!APPLY) { console.log(`DRY RUN: ${plan.length} updates`); process.exit(0) }
fs.writeFileSync(`reports/label-check/rollback-${TAG}.json`, JSON.stringify(plan.map(p => p.r), null, 1))
let n = 0
for (const p of plan) { const { error } = await sb.from('places').update(p.upd).eq('id', p.r.id); if (error) console.error(p.r.id, error.message); else n++ }
console.log(`APPLIED ${n}`)
