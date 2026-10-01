// Close pending place_reports whose place is ALREADY archived (the reported
// action has happened) and "actually_fully_vegan" reports on places that are
// already fully_vegan (nothing left to do). Status change only - rows are
// never deleted. Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const apply = process.argv.includes('--apply')
const rows = JSON.parse(fs.readFileSync('reports/reports-queue/pending-2026-10-01.json','utf8'))
const archived = rows.filter(r => r.place?.archived_at)
const redundantFv = rows.filter(r => !r.place?.archived_at && r.type === 'actually_fully_vegan' && r.place?.vegan_level === 'fully_vegan')
console.log(`archived-place reports: ${archived.length}; redundant actually_fully_vegan: ${redundantFv.length}; apply=${apply}`)
if (!apply) process.exit(0)
const ids1 = archived.map(r => r.id), ids2 = redundantFv.map(r => r.id)
const { error: e1, count: c1 } = await sb.from('place_reports').update({ status: 'reviewed' }, { count: 'exact' }).in('id', ids1)
if (e1) throw e1
const { error: e2, count: c2 } = await sb.from('place_reports').update({ status: 'reviewed' }, { count: 'exact' }).in('id', ids2)
if (e2) throw e2
console.log(`reviewed: ${c1} (archived) + ${c2} (already fully_vegan)`)
fs.writeFileSync('reports/reports-queue/closed-2026-10-01.json', JSON.stringify({ archived: ids1, redundantFv: ids2 }, null, 1))
