// Live counts for the v2 "about v2" slide. Usage (web repo root):
//   node docs/marketing/instagram-about-slide/v2/build-data.mjs
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const c = async q => (await q).count
const pl = () => sb.from('places').select('*', { count: 'exact', head: true }).is('archived_at', null)
const posts = (cat) => sb.from('posts').select('*', { count: 'exact', head: true }).eq('category', cat).eq('privacy', 'public').is('deleted_at', null)
const now = new Date().toISOString()
const { data: ev } = await sb.from('posts').select('event_data').eq('category', 'event').eq('privacy', 'public').is('deleted_at', null).limit(1000)
let countries = new Set(), last = '00000000-0000-0000-0000-000000000000'
for (;;) { const { data } = await sb.from('places').select('id,country').is('archived_at', null).gt('id', last).order('id').limit(1000); if (!data.length) break; data.forEach(r => r.country && countries.add(r.country.trim())); last = data[data.length - 1].id }
const D = {
  countries: countries.size,
  generated: now.slice(0, 10),
  eat: await c(pl().eq('category', 'eat')),
  store: await c(pl().eq('category', 'store')),
  hotel: await c(pl().eq('category', 'hotel')),
  sanctuary: await c(pl().eq('category', 'organisation').in('subcategory', ['sanctuary', 'wildlife-rescue'])),
  recipe: await c(posts('recipe')),
  events_upcoming: ev.filter(e => (e.event_data?.start_time || '') >= now).length,
}
fs.writeFileSync('docs/marketing/instagram-about-slide/v2/data.js', 'window.DATA=' + JSON.stringify(D) + ';')
console.log(D)
