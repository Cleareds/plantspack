import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await sb.from('places').select('id,name,city,country,main_image_url')
  .like('main_image_url','%images.happycow.net%')
  .in('country',['Turkey','Greece','Italy','Croatia','Portugal','Spain'])
  .eq('vegan_level','fully_vegan').is('archived_at',null)
console.log(`Total with happycow CDN: ${data.length}`)
// Group by URL to find dups
const urlMap = new Map()
for (const p of data) {
  if (!urlMap.has(p.main_image_url)) urlMap.set(p.main_image_url, [])
  urlMap.get(p.main_image_url).push(p)
}
const dups = [...urlMap.entries()].filter(([_, arr]) => arr.length > 1)
console.log(`Duplicate-URL groups: ${dups.length}`)
for (const [url, arr] of dups.slice(0, 8)) {
  console.log(`\n${url.slice(-50)}`)
  arr.forEach(p => console.log(`  - ${p.name} [${p.city}/${p.country}]`))
}
// Also extract hcmp ID from each URL to verify uniqueness
const hcIds = new Map()
for (const p of data) {
  const m = p.main_image_url.match(/hcmp(\d+)_/)
  if (m) {
    const id = m[1]
    if (!hcIds.has(id)) hcIds.set(id, [])
    hcIds.get(id).push(p)
  }
}
const dupIds = [...hcIds.entries()].filter(([_, arr]) => arr.length > 1)
console.log(`\nVenues sharing same hcmp ID (= same HappyCow venue): ${dupIds.length}`)
for (const [id, arr] of dupIds.slice(0, 10)) {
  console.log(`  hcmp${id}: ${arr.map(p => p.name + ' [' + p.city + ']').join(' | ')}`)
}
