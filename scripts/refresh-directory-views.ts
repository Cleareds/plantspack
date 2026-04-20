import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  console.log('Refreshing directory_countries + directory_cities...')
  const { error } = await s.rpc('refresh_directory_views')
  if (error) { console.error(error.message); process.exit(1) }
  console.log('✓ refreshed')
}
main()
