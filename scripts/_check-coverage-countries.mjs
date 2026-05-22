import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

for (const country of ['Croatia','Portugal','Turkey']) {
  console.log(`\n===== ${country} =====`)
  const { data: places } = await sb.from('places').select('name,city,vegan_level,is_verified,main_image_url')
    .eq('country',country).is('archived_at',null).order('city,name').limit(2000)
  const fv = places.filter(p => p.vegan_level === 'fully_vegan')
  const mv = places.filter(p => p.vegan_level === 'mostly_vegan')
  console.log(`  Total: ${places.length} | fully_vegan: ${fv.length} (verified ${fv.filter(p=>p.is_verified).length}) | mostly_vegan: ${mv.length}`)
  const byCity = {}
  for (const p of fv) byCity[p.city] = (byCity[p.city]||0) + 1
  const cities = Object.entries(byCity).sort((a,b) => b[1]-a[1])
  console.log(`  Top cities by FV count:`)
  for (const [c, n] of cities.slice(0, 10)) console.log(`    ${c}: ${n}`)
}
