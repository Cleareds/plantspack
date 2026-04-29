import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const levels = ['fully_vegan', 'mostly_vegan', 'vegan_friendly', 'vegan_options']
  for (const lvl of levels) {
    const { count } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('vegan_level', lvl).is('archived_at', null)
    console.log(`${lvl}: ${count}`)
  }
  // Also: how many have no description (low-confidence classifications)
  const { count: noDesc } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('vegan_level', 'fully_vegan').is('archived_at', null).or('description.is.null,description.eq.')
  console.log(`\nfully_vegan with no description: ${noDesc}`)
}
main()
