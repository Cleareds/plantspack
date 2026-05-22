import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const summerHubCities = ['Rome','Florence','Naples','Catania','Palermo','Milan','Venice','Turin','Bologna','Barcelona','Madrid','Valencia','Sevilla','Granada','Málaga','Palma de Mallorca','Santa Cruz de Tenerife','Ibiza','Bilbao','San Sebastián','Athens','Thessaloniki','Santorini','Mykonos','Crete','Istanbul','Antalya','Ankara']

async function stats(label, applyFilter) {
  const total = (await applyFilter(sb.from('places').select('id', { count: 'exact', head: true }))).count
  const withImg = (await applyFilter(sb.from('places').select('id', { count: 'exact', head: true }).not('main_image_url','is',null))).count
  const fvVer = (await applyFilter(sb.from('places').select('id', { count: 'exact', head: true }).eq('vegan_level','fully_vegan').eq('is_verified',true))).count
  const fvVerImg = (await applyFilter(sb.from('places').select('id', { count: 'exact', head: true }).eq('vegan_level','fully_vegan').eq('is_verified',true).not('main_image_url','is',null))).count
  console.log(`\n${label}`)
  console.log(`  all places:           ${withImg}/${total} have main_image_url (${total ? Math.round(withImg/total*100) : 0}%)`)
  console.log(`  verified fully_vegan: ${fvVerImg}/${fvVer} have main_image_url (${fvVer ? Math.round(fvVerImg/fvVer*100) : 0}%)`)
}

await stats('Croatia', q => q.eq('country','Croatia'))
await stats('Portugal', q => q.eq('country','Portugal'))
await stats('Summer hub cities (IT+ES+GR+TR)', q => q.in('city', summerHubCities))

// Also break down by country in summer hub
console.log('\n--- Summer hub breakdown by country ---')
for (const c of ['Italy','Spain','Greece','Turkey']) {
  const total = (await sb.from('places').select('id', { count: 'exact', head: true }).eq('country',c).in('city',summerHubCities)).count
  const withImg = (await sb.from('places').select('id', { count: 'exact', head: true }).eq('country',c).in('city',summerHubCities).not('main_image_url','is',null)).count
  const fvVer = (await sb.from('places').select('id', { count: 'exact', head: true }).eq('country',c).in('city',summerHubCities).eq('vegan_level','fully_vegan').eq('is_verified',true)).count
  const fvVerImg = (await sb.from('places').select('id', { count: 'exact', head: true }).eq('country',c).in('city',summerHubCities).eq('vegan_level','fully_vegan').eq('is_verified',true).not('main_image_url','is',null)).count
  console.log(`  ${c}: ${withImg}/${total} all (${total ? Math.round(withImg/total*100) : 0}%)  |  verified-FV: ${fvVerImg}/${fvVer} (${fvVer ? Math.round(fvVerImg/fvVer*100) : 0}%)`)
}
