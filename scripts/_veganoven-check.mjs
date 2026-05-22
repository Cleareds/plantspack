import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await sb.from('places').select('slug,name,city,vegan_level,archived_at').or('name.ilike.%veganoven%,name.ilike.%vegan oven%,slug.ilike.%veganoven%').limit(10)
console.log('matches:', data?.length||0)
for (const r of data||[]) console.log(`  ${r.slug.padEnd(40)} ${r.name.padEnd(25)} ${r.city.padEnd(15)} ${r.vegan_level} archived=${r.archived_at?'Y':'N'}`)
