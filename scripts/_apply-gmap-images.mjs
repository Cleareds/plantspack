import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const lines = readFileSync('/tmp/applied-images.jsonl','utf8').trim().split('\n')
const items = lines.map(l => JSON.parse(l))
function norm(s) { return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim() }
let ok = 0, miss = 0
for (const it of items) {
  // Find place by name (broad match)
  let { data } = await sb.from('places').select('id,name,city,country,main_image_url')
    .ilike('name', it.name).is('archived_at', null).limit(5)
  // If no match, try fuzzy with normalized
  if (!data?.length) {
    const k = norm(it.name)
    const { data: all } = await sb.from('places').select('id,name,city,country,main_image_url')
      .or(`name.ilike.%${it.name.split(' ')[0]}%`).is('archived_at', null).limit(20)
    data = (all||[]).filter(p => {
      const pn = norm(p.name)
      return pn === k || pn.includes(k) || k.includes(pn)
    })
  }
  // Filter by city if provided
  if (it.city) data = data.filter(p => p.city?.toLowerCase().includes(it.city.toLowerCase()) || it.city.toLowerCase().includes(p.city?.toLowerCase() || ''))
  if (!data?.length) { console.log(`  miss: ${it.name} (${it.city})`); miss++; continue }
  const target = data[0]
  if (target.main_image_url) { console.log(`  already has: ${target.name}`); continue }
  await sb.from('places').update({ main_image_url: it.src }).eq('id', target.id)
  console.log(`  + ${target.name}`)
  ok++
}
console.log(`\nApplied: ${ok}, missed: ${miss}`)
