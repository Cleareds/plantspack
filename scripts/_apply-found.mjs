import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const items = readFileSync('/tmp/found-images.jsonl','utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
let imgOk=0, webOk=0, miss=0
for (const it of items) {
  const k = norm(it.name)
  const { data } = await sb.from('places').select('id,name,city,country,main_image_url,website')
    .ilike('name', it.name).is('archived_at', null).limit(10)
  let target = data?.find(p => p.city?.toLowerCase().includes(it.city.toLowerCase()) || it.city.toLowerCase().includes(p.city?.toLowerCase() || ''))
  if (!target && data?.length) target = data[0]
  if (!target) { miss++; console.log(`miss: ${it.name}`); continue }
  const patch = {}
  if (it.img && !target.main_image_url) { patch.main_image_url = it.img; imgOk++ }
  if (it.website && !target.website) { patch.website = it.website; webOk++ }
  if (Object.keys(patch).length) await sb.from('places').update(patch).eq('id', target.id)
}
console.log(`Applied: ${imgOk} images, ${webOk} websites, missed: ${miss}`)
