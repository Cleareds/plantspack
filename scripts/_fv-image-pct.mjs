import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

console.log('=== Fully-vegan image coverage ===\n')
console.log('| Country | FV total | FV with image | Image% |')
console.log('|---|---|---|---|')
let globalTotal = 0, globalImg = 0
for (const country of ['Croatia','Portugal','Turkey','Spain','Italy','Greece','Germany']) {
  const { count: total } = await sb.from('places').select('id', { count:'exact', head:true })
    .eq('country',country).eq('vegan_level','fully_vegan').is('archived_at',null)
  const { count: withImg } = await sb.from('places').select('id', { count:'exact', head:true })
    .eq('country',country).eq('vegan_level','fully_vegan').not('main_image_url','is',null).is('archived_at',null)
  globalTotal += total; globalImg += withImg
  console.log(`| ${country} | ${total} | ${withImg} | ${total ? Math.round(withImg/total*100) : 0}% |`)
}
console.log(`| **All FV (platform-wide)** | **${globalTotal}** | **${globalImg}** | **${Math.round(globalImg/globalTotal*100)}%** |`)
