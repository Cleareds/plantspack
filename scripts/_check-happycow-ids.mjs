import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
for (const c of ['Turkey','Greece','Italy','Croatia','Portugal','Spain']) {
  const { count: totalFV } = await sb.from('places').select('id',{count:'exact',head:true})
    .eq('country',c).eq('vegan_level','fully_vegan').is('archived_at',null)
  const { count: noImg } = await sb.from('places').select('id',{count:'exact',head:true})
    .eq('country',c).eq('vegan_level','fully_vegan').is('archived_at',null).is('main_image_url',null)
  const { count: hasHC } = await sb.from('places').select('id',{count:'exact',head:true})
    .eq('country',c).eq('vegan_level','fully_vegan').is('archived_at',null).is('main_image_url',null).not('happycow_id','is',null)
  console.log(`${c}: FV=${totalFV}, no-img=${noImg}, with happycow_id=${hasHC}`)
}
