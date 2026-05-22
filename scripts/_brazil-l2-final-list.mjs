import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await sb.from('places').select('slug,name,city,website,description').eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).lt('verification_level',3)
console.log(`Remaining <L3: ${data.length}`)
for (const r of data) console.log(`  ${r.slug.padEnd(45)} | ${r.name.padEnd(28)} | ${r.city.padEnd(18)} | web=${r.website?'Y':'N'} | desc="${(r.description||'').slice(0,55)}"`)
// Also spot-check 8 "suspicious" promoted-via-description
const suspicious = ['lambs-porto-alegre','york-grill-sao-paulo','quintal-vegetariano-alfenas','vegetarianosocialclube-rio-de-janeiro','salvador-cafe-joinville','barletta-rio-de-janeiro','alle-frieden-mafra','tarang-peruibe']
console.log('\nSPOT-CHECK BUMPED:')
const { data: sus } = await sb.from('places').select('slug,name,city,vegan_level,description,website').in('slug',suspicious)
for (const r of sus||[]) console.log(`  ${r.slug.padEnd(40)} | ${r.name.padEnd(22)} | ${r.city.padEnd(18)} | desc="${(r.description||'').slice(0,70)}"`)
