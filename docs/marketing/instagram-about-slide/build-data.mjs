// Pulls live place coordinates + counts for the "about us" closing slide.
// Usage (web repo root): node docs/marketing/instagram-about-slide/build-data.mjs
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const pts = [], countries = new Set(); let last = '00000000-0000-0000-0000-000000000000'
for (;;) {
  const { data, error } = await sb.from('places').select('id,latitude,longitude,country').is('archived_at', null).gt('id', last).order('id').limit(1000)
  if (error) throw error
  if (!data.length) break
  for (const p of data) { if (p.country) countries.add(p.country.trim()); if (p.latitude != null && p.longitude != null) pts.push([+p.longitude.toFixed(2), +p.latitude.toFixed(2)]) }
  last = data[data.length - 1].id
}
const { count: recipes } = await sb.from('posts').select('*', { count: 'exact', head: true }).eq('category', 'recipe').eq('privacy', 'public').is('deleted_at', null)
const out = { generated: new Date().toISOString().slice(0, 10), places: pts.length, countries: countries.size, recipes, pts }
fs.writeFileSync('docs/marketing/instagram-about-slide/data.js', 'window.DATA=' + JSON.stringify(out) + ';')
console.log({ places: out.places, countries: out.countries, recipes })
