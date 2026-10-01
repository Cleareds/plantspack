// Print the Vault-backed /api/revalidate bearer token (service role only).
// One-off helper for copying it into the Vercel env as REVALIDATE_SECRET.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await sb.rpc('revalidate_secret')
if (error) { console.error(error.message); process.exit(1) }
process.stdout.write(String(data ?? ''))
