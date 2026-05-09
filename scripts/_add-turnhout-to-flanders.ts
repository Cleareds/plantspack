import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('country_regions').select('city_names').eq('country_slug','belgium').eq('region_slug','flanders').maybeSingle()
  if (!data) return console.log('flanders row missing')
  const cn = (data.city_names as string[]) || []
  if (cn.includes('Turnhout')) return console.log('Turnhout already in Flanders')
  const next = [...cn, 'Turnhout', 'Retie'].sort((a,b)=>a.localeCompare(b))
  const { error } = await sb.from('country_regions').update({ city_names: Array.from(new Set(next)) }).eq('country_slug','belgium').eq('region_slug','flanders')
  console.log('Turnhout + Retie -> Flanders:', error ? error.message : 'OK')
  const { error: e2 } = await sb.rpc('refresh_directory_views')
  console.log('refresh:', e2 ? e2.message : 'OK')
}
main()
