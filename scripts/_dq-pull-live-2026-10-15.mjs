// Read-only: dump all live places (cursor by id) to a JSON file. Usage: node <this> <out.json>
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const out = []; let last = '00000000-0000-0000-0000-000000000000'
for (;;) {
  const { data, error } = await sb.from('places').select('id,name,slug,city,country,address,latitude,longitude,website,phone,vegan_level,verification_level,verification_method,is_verified,osm_ref,source,created_by,review_count,category,main_image_url,opening_hours,created_at,tags').is('archived_at', null).gt('id', last).order('id').limit(1000)
  if (error) throw error
  out.push(...data); if (data.length < 1000) break; last = data.at(-1).id
}
fs.writeFileSync(process.argv[2], JSON.stringify(out))
console.log('live', out.length, 'with osm_ref', out.filter(p => p.osm_ref).length, 'website', out.filter(p => p.website).length)
