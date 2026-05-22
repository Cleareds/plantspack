import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'brazil-sao-paulo-2026-05-21'
// Find YUCAFÉ
const { data: y } = await sb.from('places').select('slug,name,vegan_level').eq('country','Brazil').eq('city','São Paulo').or('name.ilike.%YUCAFÉ%,name.ilike.%YUCAFE%,name.ilike.%Yucafe%').is('archived_at',null)
console.log('YUCAFÉ search:', y?.map(r=>`${r.slug}(${r.vegan_level})`))

const promotions = ['astronauta-cafe']
if (y?.[0]) promotions.push(y[0].slug)
for (const slug of promotions) {
  const { error } = await sb.from('places').update({
    vegan_level: 'fully_vegan', verification_method: TAG, verification_level: 3, last_verified_at: NOW,
  }).eq('slug', slug).eq('country','Brazil')
  console.log(error?`✗ ${slug}: ${error.message}`:`✓ ${slug} → fully_vegan`)
}
