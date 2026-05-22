import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync } from 'node:fs'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const sql = readFileSync('supabase/migrations/20260522100000_sprouts.sql','utf-8')
// Split on semicolons followed by newline; skip empty
const statements = sql.split(/;\s*\n/).map(s=>s.trim()).filter(s => s && !s.startsWith('--'))
console.log(`Running ${statements.length} statements`)
let ok=0, fail=0
for (let i=0; i<statements.length; i++) {
  const stmt = statements[i] + ';'
  const { error } = await sb.rpc('exec_sql', { sql: stmt }).catch(() => ({ error: { message: 'rpc not available' }}))
  if (error) { fail++; console.log(`✗ stmt ${i}: ${error.message.slice(0,80)} | ${stmt.slice(0,60)}...`) }
  else { ok++; process.stdout.write('.') }
}
console.log(`\n${ok} ok / ${fail} fail`)
