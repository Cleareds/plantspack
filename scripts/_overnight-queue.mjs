// Build the queue: every FV place in summer-hub countries without an image,
// prioritized by Turkey -> Greece -> Italy -> Croatia -> Portugal -> Spain
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const priority = ['Turkey','Greece','Italy','Croatia','Portugal','Spain']
const all = []
for (const c of priority) {
  let from = 0
  while (true) {
    const { data } = await sb.from('places')
      .select('id,name,city,country,address,website,phone,main_image_url,opening_hours')
      .eq('country', c).eq('vegan_level','fully_vegan').is('archived_at',null).is('main_image_url', null)
      .order('id').range(from, from+999)
    if (!data?.length) break
    for (const r of data) all.push({ ...r })
    if (data.length < 1000) break
    from += 1000
  }
}
console.log(`Total queue: ${all.length}`)
const byC = {}
for (const p of all) byC[p.country] = (byC[p.country]||0)+1
console.log('by country:', byC)
writeFileSync('scripts/seo-out/coverage-boost-2026-05-15/overnight-queue.json', JSON.stringify(all, null, 2))
