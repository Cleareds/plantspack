import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  // 中央区 = Chuo Ward, Tokyo (Ginza is in Chuo)
  const { error } = await sb.from('places').update({ city: 'Tokyo' }).eq('city', '中央区').eq('country', 'Japan')
  console.log('Japan: 中央区 → Tokyo:', error ?? 'OK')
  // 桂林 fix (if any missed)
  const { data: gl } = await sb.from('places').select('id').ilike('city', '%桂%').is('archived_at', null)
  console.log('Guilin remaining:', gl?.length)
  await sb.rpc('refresh_directory_views')
  console.log('Views refreshed')
}
main()
