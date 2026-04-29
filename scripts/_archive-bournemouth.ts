import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  // Archive Sunrise Organics (Google Places: CLOSED_PERMANENTLY)
  const { error: e1 } = await sb.from('places')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', 'a8d94011-2a09-4cc6-817d-29c87ea82a60')
  console.log('Sunrise Organics archived:', e1 ?? 'OK')

  // Archive Ice Harvest (company dissolved April 2024)
  const { error: e2 } = await sb.from('places')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', '9dc168f2-1f0a-4dc6-b7dd-5a57cba19947')
  console.log('Ice Harvest archived:', e2 ?? 'OK')

  // Upgrade Twelve to fully_vegan
  const { error: e3 } = await sb.from('places')
    .update({ vegan_level: 'fully_vegan' })
    .eq('id', '839bfe0f-83a9-434e-8907-603bca8057d4')
  console.log('Twelve upgraded to fully_vegan:', e3 ?? 'OK')
}
main()
