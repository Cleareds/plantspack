// Archive source=manual-2026-05-21 rows that web searches could not find (user OK 2026-10-14:
// "archive the rows that searches do not find and keep the confirmed ones").
// Reads reports/label-check/verdict-*.json. Rollback: reports/label-check/rollback-brazil-manual-2026-10-14.json
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const V = {}
for (const f of fs.readdirSync('reports/label-check').filter(f => f.startsWith('verdict-')))
  for (const v of JSON.parse(fs.readFileSync('reports/label-check/' + f))) if (!/NOT CHECKED/.test(v.evidence || '')) V[v.id] = v
// 2026-10-15: also read the automated runner's outputs.
for (const f of fs.readdirSync('reports/label-check/auto/out').filter(f => f.endsWith('.json')))
  for (const v of JSON.parse(fs.readFileSync('reports/label-check/auto/out/' + f))) if (v.verdict !== 'unchecked') V[v.id] = v
// Never archive a place a person added (user rule 2026-10-14), or one with reviews.
const IMPORT_ACCOUNT = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const { data } = await sb.from('places').select('id,name,slug,archived_at,archived_reason,review_count,created_by').eq('source', 'manual-2026-05-21').is('archived_at', null).limit(2000)
const hit = data.filter(r => V[r.id]?.verdict === 'not_found' && !(r.review_count > 0) && r.created_by === IMPORT_ACCOUNT)
console.log(hit.length, hit.map(r => r.name).join(' | '))
if (!APPLY) process.exit(0)
const rb = 'reports/label-check/rollback-brazil-manual-2026-10-14.json'
const prev = fs.existsSync(rb) ? JSON.parse(fs.readFileSync(rb)) : []
fs.writeFileSync(rb, JSON.stringify([...prev, ...hit], null, 1))
const { error } = await sb.from('places').update({ archived_at: new Date().toISOString(), archived_reason: 'unverifiable: no trace online (manual-2026-05-21 import check 2026-10-14)' }).in('id', hit.map(r => r.id))
if (error) throw error
console.log('ARCHIVED', hit.length)
