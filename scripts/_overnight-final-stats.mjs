import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
console.log('=== Final overnight session stats ===\n')
const { count: imported } = await sb.from('places').select('id',{count:'exact',head:true}).eq('source','longtail-overnight-2026-05-16')
const { count: promoted } = await sb.from('places').select('id',{count:'exact',head:true}).eq('verification_method','longtail-overnight-2026-05-16')
console.log(`Total new imports: ${imported}`)
console.log(`Total promotions to fully_vegan/mostly_vegan: ${promoted}`)
console.log('\nBy country:')
for (const c of ['Croatia','Portugal','Turkey','Spain','Italy','Greece']) {
  const { count: fv } = await sb.from('places').select('id',{count:'exact',head:true}).eq('country',c).eq('vegan_level','fully_vegan').is('archived_at',null)
  const { count: mv } = await sb.from('places').select('id',{count:'exact',head:true}).eq('country',c).eq('vegan_level','mostly_vegan').is('archived_at',null)
  const { count: fvImg } = await sb.from('places').select('id',{count:'exact',head:true}).eq('country',c).eq('vegan_level','fully_vegan').not('main_image_url','is',null).is('archived_at',null)
  console.log(`  ${c}: FV=${fv} (img=${Math.round(fvImg/fv*100)}%) | MV=${mv}`)
}
