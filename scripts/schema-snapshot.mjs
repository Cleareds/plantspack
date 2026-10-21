// Save a full ACL/RLS/policy snapshot of the public schema to backups/.
// Usage: node scripts/schema-snapshot.mjs <label>   -> backups/schema-snapshot-<label>.json
// Requires public.schema_snapshot() (migration 20261020120000) and the service role key.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const label = process.argv[2] || new Date().toISOString().slice(0,10)
const { data, error } = await sb.rpc('schema_snapshot')
if (error) { console.error(error); process.exit(1) }
const out = `backups/schema-snapshot-${label}.json`
fs.writeFileSync(out, JSON.stringify(data, null, 2))
console.log(out, '| relations', data.relations.length, '| policies', data.policies.length, '| default_acls', data.default_acls.length)
