import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const ADMIN_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const { data: posts } = await sb.from('posts').select('id, title, category, user_id, created_at, users!inner(username)').eq('privacy', 'public').is('deleted_at', null).or(`user_id.neq.${ADMIN_ID},category.not.in.(recipe,event)`).order('is_pinned', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(8)
for (const p of posts) console.log('POST', p.created_at.slice(0, 10), p.category, p.users.username, '|', (p.title || '').slice(0, 60))
const { data: revs } = await sb.from('place_reviews').select('id, rating, content, images, created_at, users!inner(username), place:place_id(name)').is('deleted_at', null).order('created_at', { ascending: false }).limit(12)
for (const r of revs) console.log('REV', r.created_at.slice(0, 10), r.users.username, r.rating, 'img', r.images?.length || 0, 'len', (r.content || '').length, '|', r.place?.name)
const { count } = await sb.from('place_reviews').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('images', 'is', null)
console.log('reviews with images col not null', count)
