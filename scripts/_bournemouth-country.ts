import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  // Find all Bournemouth places with wrong country
  const { data } = await sb.from('places').select('id,name,city,country').ilike('city','%bournemouth%').order('country')
  console.log(JSON.stringify(data, null, 2))
}
main()
