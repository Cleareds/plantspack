import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await sb.from('places').select('id,slug,name,address,description,verification_method').ilike('name','%Mandacaru%').eq('country','Brazil').is('archived_at',null)
console.log('Mandacaru-named places in Brazil:')
for (const r of data||[]) console.log(`  ${r.slug.padEnd(45)} | ${r.name.padEnd(30)} | ${(r.address||'').slice(0,60)} | method=${r.verification_method}`)
