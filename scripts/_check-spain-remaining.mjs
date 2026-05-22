import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await sb.from('places').select('id,name,city')
  .eq('country','Spain').eq('vegan_level','fully_vegan').eq('is_verified', false)
  .in('city',['Barcelona','Madrid','Valencia','Palma de Mallorca','Santa Cruz de Tenerife','Ibiza','Sevilla','Granada','Málaga','Bilbao','San Sebastián'])
  .order('city').limit(200)
console.log('count:', data?.length, 'err:', error?.message)
data?.forEach(p => console.log(`  ${p.id}  ${p.name}  [${p.city}]`))
