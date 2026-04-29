import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { count: total } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('vegan_level', 'fully_vegan').is('archived_at', null)
  const { count: withSite } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('vegan_level', 'fully_vegan').is('archived_at', null).not('website', 'is', null).neq('website', '')
  console.log(`Active fully_vegan total:           ${total}`)
  console.log(`...with website:                    ${withSite}  (${((withSite ?? 0) / (total ?? 1) * 100).toFixed(1)}%)`)
  console.log(`...without (need WebSearch path):   ${(total ?? 0) - (withSite ?? 0)}`)
}
main()
