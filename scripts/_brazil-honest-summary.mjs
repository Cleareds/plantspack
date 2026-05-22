import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const all = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('city,vegan_level,is_verified,main_image_url,website,phone,address,verification_method,verification_level,last_verified_at,description').eq('country','Brazil').is('archived_at',null).range(from,from+999)
  if (!data?.length) break
  all.push(...data); if (data.length<1000) break; from+=1000
}
const fv = all.filter(r => r.vegan_level === 'fully_vegan')
const verified = fv.filter(r => r.is_verified)
const l3 = fv.filter(r => r.verification_level === 3)
const noImg = fv.filter(r => !r.main_image_url)
const noWeb = fv.filter(r => !r.website)
const noPhone = fv.filter(r => !r.phone)
const noAddr = fv.filter(r => !r.address || /^[A-Z][a-z]+(\s[A-Z][a-z]+)*,?\s*Brazil$/.test(r.address?.trim()||''))
const stubDesc = fv.filter(r => !r.description || r.description.length < 50 || /Summary pending|Vegan restaurant in/i.test(r.description))
const byLevel = {}
for (const r of all) byLevel[r.vegan_level] = (byLevel[r.vegan_level]||0) + 1
const cities = new Set(all.map(r => r.city))
const fvCities = new Set(fv.map(r => r.city))
const fvCount = {}
for (const r of fv) fvCount[r.city] = (fvCount[r.city]||0) + 1

console.log('=== BRAZIL HONEST DATA SUMMARY ===\n')
console.log(`Total active places:        ${all.length}`)
console.log(`Distinct cities:            ${cities.size}`)
console.log(`Cities with ≥1 FV:          ${fvCities.size}`)
console.log()
console.log('VEGAN LEVEL BREAKDOWN:')
for (const [l,n] of Object.entries(byLevel).sort((a,b)=>b[1]-a[1])) console.log(`  ${l.padEnd(18)} ${String(n).padStart(5)}  ${Math.round(n/all.length*100)}%`)
console.log()
console.log('FULLY VEGAN DETAIL:')
console.log(`  Total FV:                 ${fv.length}`)
console.log(`  At verification_level=3:  ${l3.length} (${Math.round(l3.length/fv.length*100)}%)`)
console.log(`  is_verified=true (admin/community confirmed): ${verified.length} (${Math.round(verified.length/fv.length*100)}%)`)
console.log()
console.log('COMPLETENESS GAPS (Brazil FV only):')
console.log(`  Missing image:            ${noImg.length} (${Math.round(noImg.length/fv.length*100)}%)`)
console.log(`  Missing website:          ${noWeb.length} (${Math.round(noWeb.length/fv.length*100)}%)`)
console.log(`  Missing phone:            ${noPhone.length} (${Math.round(noPhone.length/fv.length*100)}%)`)
console.log(`  Missing/generic address:  ${noAddr.length} (${Math.round(noAddr.length/fv.length*100)}%)`)
console.log(`  Stub/missing description: ${stubDesc.length} (${Math.round(stubDesc.length/fv.length*100)}%)`)
console.log()
console.log('TOP 15 BRAZIL CITIES BY FV COUNT:')
for (const [c,n] of Object.entries(fvCount).sort((a,b)=>b[1]-a[1]).slice(0,15)) console.log(`  ${c.padEnd(24)} ${String(n).padStart(4)}`)
