import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
async function m() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  // Try the known refresh RPC first.
  const { error: e1 } = await sb.rpc('refresh_directory_views')
  console.log('refresh_directory_views:', e1 ? 'FAIL ' + e1.message : 'OK')
  // List candidate refresh RPCs we know about across the codebase.
  for (const rpc of ['refresh_city_ranks', 'refresh_vegan_scores', 'refresh_city_score', 'refresh_directory']) {
    const { error } = await sb.rpc(rpc as any)
    console.log(`${rpc}:`, error ? `skip (${error.message.slice(0, 80)})` : 'OK')
  }
}
m()
