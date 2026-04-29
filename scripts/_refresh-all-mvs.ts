import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
async function m() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  // refresh_directory_views handles directory_cities + directory_countries
  const { error: e1 } = await sb.rpc('refresh_directory_views')
  console.log('refresh_directory_views:', e1 ? 'FAIL '+e1.message : 'OK')
  // city_scores is a separate MV; try its refresh function or raw refresh.
  for (const rpc of ['refresh_city_scores', 'refresh_scores', 'recompute_city_scores']) {
    const { error } = await sb.rpc(rpc as any)
    if (!error) { console.log(`${rpc}: OK`); return }
  }
  // Fall back to executing raw SQL via a generic exec function if available.
  const { error: e2 } = await sb.rpc('exec_sql' as any, { sql: 'REFRESH MATERIALIZED VIEW CONCURRENTLY city_scores;' })
  console.log('city_scores raw refresh:', e2 ? `skip (${e2.message.slice(0,80)})` : 'OK')
}
m()
