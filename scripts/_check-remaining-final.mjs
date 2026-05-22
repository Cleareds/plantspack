import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const countries = ['Spain','Italy','Greece','Turkey','Croatia','Portugal']
for (const c of countries) {
  const { count: total } = await sb.from('places').select('id', { count: 'exact', head: true })
    .eq('country',c).eq('vegan_level','fully_vegan')
  const { count: verified } = await sb.from('places').select('id', { count: 'exact', head: true })
    .eq('country',c).eq('vegan_level','fully_vegan').eq('is_verified', true)
  console.log(`${c}: ${verified}/${total} verified (${Math.round(verified/total*100)}%)`)
}
