import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'node:fs'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await sb.from('places').select('slug,name,city').eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).is('main_image_url',null).order('id')
fs.writeFileSync('/tmp/br-imageless.json', JSON.stringify(data,null,2))
console.log(`Wrote ${data.length} imageless FV to /tmp/br-imageless.json`)
console.log('First 6:')
for (const r of data.slice(0,6)) console.log(`  ${r.slug}\t${r.name}\t${r.city}`)
