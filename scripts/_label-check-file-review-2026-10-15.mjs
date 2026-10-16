// File label-check verdicts that the apply rules did not act on (closed / not_found at
// MEDIUM confidence) into the Data Quality review queue (place_corrections, proposed_action).
// Also files rows held by the apply script (auto/held.json). Dry-run by default.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const AUDIT = 'label-check-auto-2026-10-15'
const IMPORT_ACCOUNT = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const A = 'reports/label-check/auto/'

const V = []
for (const f of fs.readdirSync(A + 'out').filter(f => /^c\d+\.json$/.test(f)))
  for (const v of JSON.parse(fs.readFileSync(A + 'out/' + f, 'utf8')))
    if ((v.verdict === 'closed' || v.verdict === 'not_found') && v.confidence === 'medium') V.push(v)
if (fs.existsSync(A + 'held.json')) V.push(...JSON.parse(fs.readFileSync(A + 'held.json', 'utf8')))

const ids = [...new Set(V.map(v => v.id))]
const P = {}
for (let i = 0; i < ids.length; i += 200) {
  const { data, error } = await sb.from('places').select('id,name,city,country,archived_at').in('id', ids.slice(i, i + 200))
  if (error) throw error
  for (const p of data) P[p.id] = p
}
// Skip places already archived and places that already have a pending item from this audit.
const { data: existing } = await sb.from('place_corrections').select('place_id').eq('status', 'pending').eq('corrections->>audit', AUDIT)
const have = new Set((existing || []).map(r => r.place_id))
const rows = []
for (const v of V) {
  const p = P[v.id]
  if (!p || p.archived_at || have.has(v.id) || rows.some(r => r.place_id === v.id)) continue
  const what = v.hold ? `held (${v.hold})` : v.verdict === 'closed' ? 'probably permanently closed' : 'no trace of this business found online'
  rows.push({
    place_id: v.id, user_id: IMPORT_ACCOUNT, status: 'pending',
    corrections: { proposed_action: 'archive_or_keep', audit: AUDIT, verdict: v.verdict, confidence: v.confidence },
    note: `CLI-REVIEW ${AUDIT}: ${p.name} (${p.city || '?'}, ${p.country}) - ${what}, ${v.confidence} confidence, so it was not archived automatically. Evidence: ${(v.evidence || '').slice(0, 300)}${v.website_found ? ` | site: ${v.website_found}` : ''}. Decide archive vs keep.`,
  })
}
console.log(`to file: ${rows.length} (closed ${rows.filter(r => r.corrections.verdict === 'closed').length}, not_found ${rows.filter(r => r.corrections.verdict === 'not_found').length})`)
for (const r of rows.slice(0, 5)) console.log(' ', r.note.slice(0, 160))
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
const { error } = await sb.from('place_corrections').insert(rows)
if (error) throw error
console.log('FILED', rows.length)
