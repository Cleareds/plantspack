import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('places').select('name,vegan_level,country,archived_at')
    .eq('city','Bournemouth').in('name',['Mad Cucumber','Twelve'])
  console.log(JSON.stringify(data, null, 2))
}
main()
