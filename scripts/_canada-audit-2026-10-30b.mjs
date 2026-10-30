// Canada audit second pass 2026-10-30 (verify-country): applies a reviewed plan file.
// Plan = JSON array of { id, slug, update?: {...places columns}, archive?: "<archived_reason>", note? }.
// Never deletes; never sets admin_review or is_verified. Rollback (prior values of every touched column)
// is written next to the plan as rollback-<plan name>.json before any write.
// Usage: node scripts/_canada-audit-2026-10-30b.mjs <plan.json> [--apply]
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
const [planFile] = process.argv.slice(2).filter(a => !a.startsWith('--'))
const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'))
for (const op of plan) {
  const u = op.update || {}
  if (u.verification_method === 'admin_review' || u.is_verified === true) throw new Error(`forbidden claim in ${op.slug}`)
  if ('address' in u && u.address == null) throw new Error(`address is NOT NULL (${op.slug})`)
}
const cols = [...new Set(['id', 'slug', 'archived_at', 'archived_reason', 'admin_notes', ...plan.flatMap(op => Object.keys(op.update || {}))])]
const { data: rows, error } = await sb.from('places').select(cols.join(',')).in('id', plan.map(op => op.id))
if (error) throw error
const byId = Object.fromEntries(rows.map(r => [r.id, r]))
for (const op of plan) {
  const r = byId[op.id]
  if (!r) throw new Error(`missing ${op.slug}`)
  if (r.slug !== op.slug) throw new Error(`slug mismatch ${op.id}: ${r.slug} != ${op.slug}`)
  if (r.archived_at) console.log('SKIP already archived', op.slug)
  else console.log(op.archive ? 'ARCHIVE' : 'UPDATE ', op.slug.padEnd(48), op.archive || JSON.stringify(op.update).slice(0, 140))
}
if (!APPLY) { console.log(`DRY RUN: ${plan.length} ops`); process.exit(0) }

const rb = path.join(path.dirname(planFile), `rollback-${path.basename(planFile)}`)
fs.writeFileSync(rb, JSON.stringify(rows, null, 1))
const now = new Date().toISOString()
let n = 0
for (const op of plan) {
  if (byId[op.id].archived_at) continue
  const upd = { ...(op.update || {}),
    // admin_notes: append, never overwrite
    ...(op.update?.admin_notes && byId[op.id].admin_notes ? { admin_notes: `${byId[op.id].admin_notes}\n${op.update.admin_notes}` } : {}), ...(op.archive ? { archived_at: now, archived_reason: op.archive } : {}) }
  const r = await sb.from('places').update(upd).eq('id', op.id)
  if (r.error) throw new Error(`${op.slug}: ${r.error.message}`)
  n++
}
console.log(`applied ${n} ops; rollback ${rb}`)
