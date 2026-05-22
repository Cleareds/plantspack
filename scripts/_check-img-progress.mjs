import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
for (const country of ['Croatia','Portugal','Turkey']) {
  const { count: total } = await sb.from('places').select('id', { count: 'exact', head: true })
    .eq('country',country).eq('vegan_level','fully_vegan').is('archived_at',null)
  const { count: withImg } = await sb.from('places').select('id', { count: 'exact', head: true })
    .eq('country',country).eq('vegan_level','fully_vegan').not('main_image_url','is',null).is('archived_at',null)
  console.log(`${country}: ${withImg}/${total} fully_vegan with image (${Math.round(withImg/total*100)}%)`)
}
