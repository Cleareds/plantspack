import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const all = []
for (const country of ['Croatia','Portugal','Turkey']) {
  let from = 0
  while (true) {
    const { data } = await sb.from('places').select('id,name,city,country,website,address')
      .eq('country',country).eq('vegan_level','fully_vegan').is('archived_at',null).is('main_image_url', null)
      .order('id').range(from, from + 999)
    if (!data?.length) break
    all.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
}
console.log(`FV places without image: ${all.length}`)
const byCountry = {}
for (const p of all) byCountry[p.country] = (byCountry[p.country]||0)+1
console.log(`  by country: ${JSON.stringify(byCountry)}`)
writeFileSync('scripts/seo-out/coverage-boost-2026-05-15/fv-missing-images.json', JSON.stringify(all, null, 2))
