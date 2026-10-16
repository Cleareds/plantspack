// Apply existence-check verdicts (BRIEF-EXIST.md) - data-quality 5, 2026-10-15. Dry-run unless --apply.
//   node scripts/_dq-exist-apply-2026-10-15.mjs <dir> --tag=<tag> [--apply]   (reads <dir>/out/*.json)
// Rules (only medium/high act; never admin_review / is_verified):
//   closed (high)               -> archive
//   not_found (high)            -> archive (stub-shaped or dead-domain import row with no trace online;
//                                  same rule the user approved for the Brazil manual import)
//   closed/not_found (medium), moved -> place_corrections (Research Review, proposed_action archive_or_keep)
//   level verdicts (eat/store)  -> vegan_level change; fully_vegan promotion only at high
//   exists / level, website_found -> website set when the stored one is empty or dead (queue D)
// Never archives a row with reviews or one a person added: those go to Research Review.
// Rollback: <dir>/rollback-<tag>.json
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const DIR = process.argv[2]
const APPLY = process.argv.includes('--apply')
const TAG = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'exist-check-2026-10-15'
const IMPORT_ACCOUNT = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const LEVELS = ['fully_vegan', 'mostly_vegan', 'vegan_friendly', 'vegan_options']

const queue = {}
for (const f of fs.readdirSync(DIR + '/chunks')) for (const r of JSON.parse(fs.readFileSync(`${DIR}/chunks/${f}`, 'utf8'))) queue[r.id] = r
const V = fs.readdirSync(DIR + '/out').filter(f => f.endsWith('.json')).flatMap(f => JSON.parse(fs.readFileSync(`${DIR}/out/${f}`, 'utf8')))
const P = {}
const ids = V.map(v => v.id)
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await sb.from('places').select('id,name,city,country,category,website,vegan_level,verification_level,verification_method,archived_at,admin_notes,tags,review_count,created_by').in('id', ids.slice(i, i + 200))
  if (error) throw error
  for (const p of data) P[p.id] = p
}
const now = new Date().toISOString()
const plan = [], review = [], tally = {}
for (const v of V) {
  const p = P[v.id], q = queue[v.id]
  if (!p || p.archived_at || !q) continue
  const sure = v.confidence === 'high' || v.confidence === 'medium'
  const protectedRow = (p.review_count || 0) > 0 || p.created_by !== IMPORT_ACCOUNT
  const note = `[${TAG}] ${{ D: 'dead website domain', O: 'OSM marks closed/deleted', S: 'stub row' }[q.queue] || q.queue} check: ${v.verdict} (${v.confidence}) - "${(v.evidence || '').slice(0, 160)}"`
  let upd = null, act = 'none'
  if (sure && (v.verdict === 'closed' || v.verdict === 'not_found')) {
    if (v.confidence === 'high' && !protectedRow) {
      upd = { archived_at: now, archived_reason: v.verdict === 'closed' ? `closed (${TAG})` : `no trace online (${TAG})` }
      act = `archive-${v.verdict}`
    } else { review.push({ p, v }); act = `review-${v.verdict}` }
  } else if (sure && v.verdict === 'moved') { review.push({ p, v }); act = 'review-moved' }
  else if (sure && LEVELS.includes(v.verdict) && p.category !== 'organisation' && p.vegan_level) {
    if (v.verdict === p.vegan_level) { upd = { verification_level: Math.max(p.verification_level || 0, 2), verification_method: TAG }; act = 'confirm' }
    else if (v.verdict === 'fully_vegan' && v.confidence !== 'high') act = 'none'
    else { upd = { vegan_level: v.verdict, verification_level: 2, verification_method: TAG }; act = `${p.vegan_level}->${v.verdict}` }
  }
  // A real site found for a row with no site or a dead one.
  const found = v.website_found && /^https?:\/\//.test(v.website_found) && !/plantspack/i.test(v.website_found)
  if (sure && found && !act.startsWith('archive') && !act.startsWith('review') && v.verdict !== 'unclear' && v.verdict !== 'not_found') {
    upd = { ...(upd || {}), website: v.website_found }
    act += '+website'
  }
  tally[`${q.queue} ${act}`] = (tally[`${q.queue} ${act}`] || 0) + 1
  if (!upd) continue
  if (upd.website && q.queue === 'D') upd.admin_notes_extra = ` | old dead website: ${p.website}`
  const extra = upd.admin_notes_extra || ''; delete upd.admin_notes_extra
  plan.push({ p, act, upd: { ...upd, tags: [...new Set([...(p.tags || []), TAG])], admin_notes: `${p.admin_notes ? p.admin_notes + '\n' : ''}${note}${extra}` } })
}
console.log(Object.entries(tally).sort())
for (const x of plan.filter(x => x.act !== 'confirm').slice(0, 60)) console.log(' ', x.act.padEnd(34), x.p.name, '|', x.p.city)
console.log(`review queue: ${review.length}`)
if (!APPLY) { console.log(`DRY RUN: ${plan.length} updates`); process.exit(0) }
fs.writeFileSync(`${DIR}/rollback-${TAG}.json`, JSON.stringify(plan.map(x => x.p), null, 1))
let n = 0
for (const x of plan) { const { error } = await sb.from('places').update(x.upd).eq('id', x.p.id); if (error) console.error(x.p.id, error.message); else n++ }
const { data: existing } = await sb.from('place_corrections').select('place_id').eq('status', 'pending').eq('corrections->>audit', TAG)
const open = new Set((existing || []).map(r => r.place_id))
const ins = review.filter(({ p }) => !open.has(p.id)).map(({ p, v }) => ({
  place_id: p.id, user_id: IMPORT_ACCOUNT, status: 'pending',
  corrections: { proposed_action: 'archive_or_keep', audit: TAG, verdict: v.verdict, confidence: v.confidence },
  note: `CLI-REVIEW ${TAG}: ${p.name} (${p.city || '?'}, ${p.country}) - ${v.verdict} (${v.confidence})${(p.review_count || 0) > 0 ? ', has reviews' : p.created_by !== IMPORT_ACCOUNT ? ', added by a person' : ''}. Evidence: ${(v.evidence || '').slice(0, 300)}${v.website_found ? ` | site: ${v.website_found}` : ''}. Decide archive vs keep.`,
}))
if (ins.length) { const { error } = await sb.from('place_corrections').insert(ins); if (error) throw error }
console.log(`APPLIED ${n}, filed for review ${ins.length}`)
