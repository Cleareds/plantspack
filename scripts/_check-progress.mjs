import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data, count } = await sb.from('places').select('id,name,country,city,vegan_level,main_image_url,website', { count: 'exact' })
  .eq('source','coverage-boost-2026-05-15')
console.log(`Imported so far: ${count}`)
console.log(`  with image: ${data.filter(p => p.main_image_url).length}`)
console.log(`  with website: ${data.filter(p => p.website).length}`)
const byCountry = {}
for (const p of data) byCountry[p.country] = (byCountry[p.country]||0)+1
console.log(`  by country: ${JSON.stringify(byCountry)}`)
