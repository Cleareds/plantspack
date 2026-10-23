// Belgium part-2 prep (2026-10-23): De Levensboom description + L3 (HappyCow 'fully vegan' + Elle 'uitsluitend veganistisch'),
// DreamCATchers website (own contact page lists Baudelokaai 13, which the row already has).
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const slugs = ['de-levensboom-hasselt', 'dreamcatchers-ghent']
const { data: before } = await sb.from('places').select('*').in('slug', slugs)
fs.writeFileSync('backups/belgium-part2-fixes-2026-10-23.json', JSON.stringify(before, null, 2))
const lev = before.find(p => p.slug === 'de-levensboom-hasselt')
let r = await sb.from('places').update({
  description: 'Fully vegan restaurant on Leopoldplein in Hasselt serving organic, sugar-free set menus of three to five courses. HappyCow lists it as fully vegan and Elle Belgium describes the menu as exclusively vegan. Cash only, according to reviews.',
  verification_level: Math.max(lev.verification_level || 0, 3),
  verification_method: lev.verification_method === 'admin_review' ? lev.verification_method : 'belgium-part2-websearch-2026-10-23',
  last_verified_at: new Date().toISOString(),
  tags: Array.from(new Set([...(lev.tags || []), 'websearch_confirmed_vegan'])),
}).eq('id', lev.id).select('slug,verification_level,verification_method')
console.log(r.error?.message || JSON.stringify(r.data))
r = await sb.from('places').update({ website: 'https://wearedreamcatchers.be/' }).eq('slug', 'dreamcatchers-ghent').is('website', null).select('slug,website')
console.log(r.error?.message || JSON.stringify(r.data))
for (const p of before) await fetch('https://www.plantspack.com/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.REVALIDATE_SECRET}` }, body: JSON.stringify({ place_id: p.id }) }).catch(() => {})
