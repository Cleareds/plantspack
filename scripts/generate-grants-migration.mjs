// Generate an explicit Data API grants migration from a schema snapshot.
//
// Why: from 2026-10-30 Supabase no longer auto-grants anon/authenticated/
// service_role on new public tables, and a `supabase db reset` or preview branch
// replays our migrations from scratch - most of which create tables without
// grants. This emits, per relation, exactly the grants the live DB holds today
// (table-level AND column-level), so a rebuilt schema matches production.
//
// Usage:
//   node scripts/schema-snapshot.mjs 2026-10-20-before
//   node scripts/generate-grants-migration.mjs backups/schema-snapshot-2026-10-20-before.json \
//        > supabase/migrations/20261020130000_data_api_grants_explicit.sql
//
// Rules:
// - Only relations owned by `postgres` (ours). Extension-owned objects such as
//   spatial_ref_sys cannot be granted/revoked by us (silent no-op).
// - Tables/sequences: mirror the live ACL exactly. RLS stays the real gate.
// - Views / materialized views: SELECT only, plus an explicit REVOKE of the write
//   privileges the old default grants left on them (not updatable anyway).
import fs from 'fs'

const file = process.argv[2]
if (!file) { console.error('usage: node scripts/generate-grants-migration.mjs <snapshot.json>'); process.exit(1) }
const snap = JSON.parse(fs.readFileSync(file, 'utf8'))
const ROLES = ['anon', 'authenticated', 'service_role']
const TABLE_PRIVS = { r: 'select', a: 'insert', w: 'update', d: 'delete', D: 'truncate', x: 'references', t: 'trigger' }
const SEQ_PRIVS = { r: 'select', w: 'update', U: 'usage' }
const WRITE_PRIVS = 'insert, update, delete, truncate, references, trigger'

function parseAcl(acl) {
  // aclitem text: grantee=privs/grantor  (grantee '' = PUBLIC); strip '*' (grant option)
  const out = {}
  for (const item of acl || []) {
    const m = /^"?([^=]*)=([a-zA-Z*]*)\/(.+?)"?$/.exec(item)
    if (!m) continue
    const grantee = m[1] || 'PUBLIC'
    out[grantee] = m[2].replace(/\*/g, '')
  }
  return out
}
const privNames = (letters, map) => [...letters].map(l => map[l]).filter(Boolean)
const q = (s) => `"${s}"`

const lines = []
lines.push(`-- Explicit Data API grants for every relation in public (generated ${new Date().toISOString().slice(0, 10)}`)
lines.push(`-- from ${file}). See scripts/generate-grants-migration.mjs for the rationale.`)
lines.push(`-- Idempotent: on the live DB every statement is a no-op; on a rebuilt schema it`)
lines.push(`-- restores exactly the grants production holds. RLS policies remain the gate.`)
lines.push(``)

const skipped = []
for (const r of snap.relations) {
  if (r.owner !== 'postgres') { skipped.push(`${r.name} (owner ${r.owner})`); continue }
  const acl = parseAcl(r.acl)
  const rel = `public.${q(r.name)}`
  const isSeq = r.kind === 'S'
  const isView = r.kind === 'v' || r.kind === 'm'
  const stmts = []
  for (const role of ROLES) {
    const letters = acl[role]
    if (!letters) continue
    if (isSeq) {
      const p = privNames(letters, SEQ_PRIVS)
      if (p.length) stmts.push(`grant ${p.join(', ')} on sequence ${rel} to ${role};`)
    } else if (isView) {
      if (letters.includes('r')) stmts.push(`grant select on ${rel} to ${role};`)
    } else {
      const p = privNames(letters, TABLE_PRIVS)
      if (p.length) stmts.push(`grant ${p.join(', ')} on table ${rel} to ${role};`)
    }
  }
  if (isView) stmts.push(`revoke ${WRITE_PRIVS} on ${rel} from anon, authenticated;`)
  // Column-level grants (e.g. users: anon/authenticated may read only safe columns).
  for (const [col, colAcl] of Object.entries(r.column_acls || {})) {
    const ca = parseAcl(colAcl)
    for (const role of ROLES) {
      const letters = ca[role]
      if (!letters) continue
      const p = privNames(letters, TABLE_PRIVS)
      if (p.length) stmts.push(`grant ${p.join(', ')} (${q(col)}) on table ${rel} to ${role};`)
    }
  }
  if (!stmts.length) continue
  lines.push(`-- ${r.name} (${{ r: 'table', p: 'partitioned table', v: 'view', m: 'materialized view', S: 'sequence', f: 'foreign table' }[r.kind] || r.kind})`)
  lines.push(...stmts, ``)
}
if (skipped.length) {
  lines.push(`-- Skipped (not owned by postgres, cannot be granted by us):`)
  for (const s of skipped) lines.push(`--   ${s}`)
}
process.stdout.write(lines.join('\n') + '\n')
