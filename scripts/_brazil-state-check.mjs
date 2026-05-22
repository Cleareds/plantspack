import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { count: fv } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null)
const { count: l3 } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).eq('verification_level',3)
const { count: l2 } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).lt('verification_level',3)
const { count: noimg } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).is('main_image_url',null)
const { count: noweb } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).is('website',null)
console.log(`BRAZIL FV: ${fv}, L3 ${l3}, <L3 ${l2}, missing image ${noimg}, missing website ${noweb}`)

// L2 FV that need verification — show by city
const { data: l2places } = await sb.from('places').select('slug,name,city,verification_method').eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).lt('verification_level',3)
const byCity = {}
for (const r of l2places || []) byCity[r.city] = (byCity[r.city]||0)+1
console.log('\nTop L2 FV by city:')
for (const [c,n] of Object.entries(byCity).sort((a,b)=>b[1]-a[1]).slice(0,15)) console.log(`  ${c.padEnd(22)} ${n}`)
