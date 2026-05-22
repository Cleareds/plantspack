import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const summerHubCities = ['Rome','Florence','Naples','Catania','Palermo','Milan','Venice','Turin','Bologna','Barcelona','Madrid','Valencia','Sevilla','Granada','Málaga','Palma de Mallorca','Santa Cruz de Tenerife','Ibiza','Bilbao','San Sebastián','Athens','Thessaloniki','Santorini','Mykonos','Crete','Istanbul','Antalya','Ankara']

// Croatia + Portugal full-country + summer hub cities
async function fetchTargets() {
  const all = []
  const baseCols = 'id,name,city,country,website,vegan_level,is_verified,main_image_url'
  // Croatia + Portugal whole-country fully_vegan no image
  for (const c of ['Croatia','Portugal']) {
    const { data } = await sb.from('places').select(baseCols)
      .eq('country',c).eq('vegan_level','fully_vegan').is('main_image_url',null).limit(500)
    all.push(...(data||[]))
  }
  // Summer hub cities fully_vegan no image
  const { data: hub } = await sb.from('places').select(baseCols)
    .in('city', summerHubCities).in('country',['Italy','Spain','Greece','Turkey'])
    .eq('vegan_level','fully_vegan').is('main_image_url',null).limit(1000)
  all.push(...(hub||[]))
  return all
}
const targets = await fetchTargets()
console.log(`Total fully_vegan places missing image: ${targets.length}`)
const withSite = targets.filter(t => t.website && t.website.trim())
const withoutSite = targets.filter(t => !t.website || !t.website.trim())
console.log(`  with website (scrapable): ${withSite.length}`)
console.log(`  without website (manual): ${withoutSite.length}`)
console.log('\nBy country:')
const byCountry = {}
for (const t of targets) byCountry[t.country] = (byCountry[t.country]||0)+1
Object.entries(byCountry).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`))
writeFileSync('scripts/seo-out/summer-hub-audit-2026-05-15/image-targets.json', JSON.stringify(targets, null, 2))
console.log('\nWrote scripts/seo-out/summer-hub-audit-2026-05-15/image-targets.json')
