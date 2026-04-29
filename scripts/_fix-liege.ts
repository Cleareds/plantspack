import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  // Merge Liege → Liège (keep the accented form, it's the correct spelling)
  const { error } = await sb.from('places').update({ city: 'Liège' }).eq('city', 'Liege').eq('country', 'Belgium')
  console.log('Belgium: Liege → Liège:', error ?? 'OK')
  const { error: e2 } = await sb.rpc('refresh_directory_views')
  console.log('Refreshed views:', e2 ?? 'OK')
}
main()
