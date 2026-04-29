import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data } = await sb.from('places').select('id,name,vegan_level,archived_at').ilike('city','%bournemouth%').order('name')
  console.log(JSON.stringify(data, null, 2))
}

main()
