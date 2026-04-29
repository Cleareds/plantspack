import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
async function m() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb.from('places').select('id, name, city, country, archived_at, vegan_level').or('city.ilike.%skopje%,city.ilike.%скопје%')
  for (const r of data || []) console.log(`  arch=${r.archived_at?'Y':'N'}  [${r.country}|${r.city}]  ${r.name}  (${r.vegan_level})`)
}
m()
