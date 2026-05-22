import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { writeFileSync } from 'node:fs'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await sb.from('places').select('slug,name,city').eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).is('main_image_url',null).order('id').limit(25)
writeFileSync('/tmp/br-fb-targets.json', JSON.stringify(data,null,2))
console.log(`${data.length} targets:`)
for (const r of data) console.log(`  ${r.slug.padEnd(45)} | ${r.name.padEnd(30)} | ${r.city}`)
