// Read-only: the human-reported place_reports (not the machine-seeded duplicate
// pairs), joined to the place, for the 2026-10-01 review pass.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: reports, error } = await sb.from('place_reports').select('id, place_id, type, note, status, user_id, created_at, related_place_id').eq('status','pending').neq('type','duplicate').order('created_at')
if (error) throw error
const ids = [...new Set(reports.map(r=>r.place_id))]
const places = new Map()
for (let i=0;i<ids.length;i+=200) { const { data } = await sb.from('places').select('id, name, slug, city, country, category, vegan_level, website, verification_level, verification_method, archived_at, is_verified, tags, admin_notes, review_count').in('id', ids.slice(i,i+200)); for (const p of data||[]) places.set(p.id,p) }
const out = reports.map(r => ({ ...r, place: places.get(r.place_id) || null }))
fs.mkdirSync('reports/reports-queue', { recursive: true })
fs.writeFileSync('reports/reports-queue/pending-2026-10-01.json', JSON.stringify(out, null, 1))
const byType = {}; for (const r of out) byType[r.type]=(byType[r.type]||0)+1
console.log('pending non-duplicate reports:', out.length, byType)
console.log('with human user_id:', out.filter(r=>r.user_id).length, '| place archived already:', out.filter(r=>r.place?.archived_at).length, '| place missing:', out.filter(r=>!r.place).length)
for (const t of ['actually_fully_vegan','not_fully_vegan','permanently_closed','hours_wrong','few_vegan_options','no_vegan_options','not_vegan_friendly','temporarily_closed']) {
  console.log(`\n== ${t}`)
  for (const r of out.filter(r=>r.type===t).slice(0,80)) { const p=r.place; console.log(`  ${r.created_at.slice(0,10)} ${r.user_id?'U':'-'} | ${p?.name??'?'} | ${p?.city??''}, ${p?.country??''} | ${p?.vegan_level??''} L${p?.verification_level??'-'} | ${p?.website??'-'} | ${(r.note||'').replace(/\s+/g,' ').slice(0,90)}${p?.archived_at?' | ARCHIVED':''}`) }
}
