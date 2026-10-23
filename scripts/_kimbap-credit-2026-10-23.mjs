// Kimbap Spot (Bochum): credit the mobile submitter as the person who added it (user request 2026-10-23).
// The row was an OSM bulk import owned by the admin account; stevenslaurie submitted it independently
// via mobile on 2026-10-22 (submission 543ba6e3) with a fully_vegan claim that HappyCow corroborates.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const PID = 'c4f9d429-bfb8-44d3-b555-23670766ca1b', UID = '3987478d-5dc0-46db-8c25-8ab0f4ee906c', ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const { data: p } = await sb.from('places').select('*').eq('id', PID).single()
const { data: pc } = await sb.from('place_contributors').select('*').eq('place_id', PID)
fs.writeFileSync('backups/kimbap-spot-credit-2026-10-23.json', JSON.stringify({ place: p, contributors: pc }, null, 2))
if (p.created_by !== ADMIN) { console.log('created_by is not admin, leaving it:', p.created_by); process.exit(0) }
const tags = Array.from(new Set([...(p.tags || []), 'community_submitted']))
let r = await sb.from('places').update({ created_by: UID, verification_level: Math.max(p.verification_level || 0, 4), tags }).eq('id', PID).select('created_by,verification_level,verification_method,is_verified,vegan_level')
if (r.error) throw r.error; console.log('place', r.data)
r = await sb.from('place_contributors').update({ role: 'creator', note: 'submitted via mobile 2026-10-22; credited as creator (place was a bulk OSM import)' }).eq('place_id', PID).eq('user_id', UID).eq('role', 'co_submitter').select('role')
if (r.error) throw r.error; console.log('contributor', r.data)
r = await sb.from('place_submissions').update({ review_note: 'same venue (Ostring 22); submitter credited as creator of the imported row; level 3 -> 4 (independent community submission + HappyCow)' }).eq('id', '543ba6e3-6f53-4328-ac95-04ac7a567cd9').select('status')
console.log('submission', r.error?.message || r.data)
const res = await fetch('https://www.plantspack.com/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.REVALIDATE_SECRET}` }, body: JSON.stringify({ place_id: PID }) })
console.log('revalidate', res.status)
