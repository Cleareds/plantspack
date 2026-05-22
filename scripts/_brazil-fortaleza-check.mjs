import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await sb.from('places').select('slug,name,vegan_level,verification_level,main_image_url,address,phone,website,last_verified_at').eq('country','Brazil').eq('city','Fortaleza').is('archived_at',null).order('vegan_level').order('name')
console.log(`Fortaleza final state (${data?.length} places):`)
for (const r of data) console.log(`  ${r.slug.padEnd(48)} | ${r.vegan_level.padEnd(15)} | L${r.verification_level} | img=${r.main_image_url?'Y':'N'} | addr=${r.address?'Y':'N'} | phone=${r.phone?'Y':'N'} | web=${r.website?'Y':'N'}`)
