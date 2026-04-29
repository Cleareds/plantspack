import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { error } = await sb.from('places').update({ vegan_level: 'fully_vegan' }).eq('id','839bfe0f-83a9-434e-8907-603bca8057d4')
  console.log('Twelve → fully_vegan:', error ?? 'OK')
  // Refresh directory view so fully_vegan_count updates
  const { error: e2 } = await sb.rpc('refresh_directory_views')
  console.log('Refreshed views:', e2 ?? 'OK')
}
main()
