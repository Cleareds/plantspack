import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { count: brTotal } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').is('archived_at',null)
const { count: brFv } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null)
const { count: brL3 } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('verification_level',3).is('archived_at',null)
console.log(`Brazil: ${brTotal} places, ${brFv} FV, ${brL3} L3`)
for (const c of ['Fortaleza','São Paulo','Rio de Janeiro']) {
  const { count: t } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('city',c).is('archived_at',null)
  const { count: fv } = await sb.from('places').select('*',{count:'exact',head:true}).eq('country','Brazil').eq('city',c).eq('vegan_level','fully_vegan').is('archived_at',null)
  console.log(`  ${c.padEnd(18)} ${t} places, ${fv} FV`)
}
