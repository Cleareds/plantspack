import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data, count } = await sb.from('places').select('id,name,vegan_level,is_verified,main_image_url,website,address,latitude,opening_hours', { count: 'exact' })
  .eq('source','berlin-google-map-2026-05-15').order('name')
console.log(`Total imported (source=berlin-google-map-2026-05-15): ${count}`)
const byLvl = {}
for (const p of data) byLvl[p.vegan_level] = (byLvl[p.vegan_level]||0) + 1
console.log('\nBy vegan_level:')
for (const [k,v] of Object.entries(byLvl)) console.log(`  ${k}: ${v}`)
const withImg = data.filter(p => p.main_image_url).length
const withSite = data.filter(p => p.website).length
const withAddress = data.filter(p => p.address && p.address !== 'Berlin, Germany').length
const withCoords = data.filter(p => p.latitude).length
console.log('\nEnrichment coverage:')
console.log(`  Image:    ${withImg}/${data.length} (${Math.round(withImg/data.length*100)}%)`)
console.log(`  Website:  ${withSite}/${data.length} (${Math.round(withSite/data.length*100)}%)`)
console.log(`  Address (geocoded): ${withAddress}/${data.length} (${Math.round(withAddress/data.length*100)}%)`)
console.log(`  Coordinates: ${withCoords}/${data.length} (${Math.round(withCoords/data.length*100)}%)`)
