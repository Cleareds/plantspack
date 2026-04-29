import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { error } = await sb.rpc('refresh_directory_views')
  if (error) {
    // Try direct SQL if no RPC
    const { error: e2 } = await sb.from('_sql' as any).select('*').eq('query', 'REFRESH MATERIALIZED VIEW directory_cities')
    console.log('RPC failed:', error.message)
    console.log('Direct attempt:', e2)
  } else {
    console.log('Refreshed OK')
  }
}
main()
