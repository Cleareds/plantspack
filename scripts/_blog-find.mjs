import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await sb.from('posts').select('id,slug,title,privacy').ilike('slug','%beyond-berlin%')
console.log('matches:', data?.length)
for (const r of data||[]) console.log(`  ${r.id} | slug=${r.slug} | privacy=${r.privacy} | title=${r.title?.slice(0,50)}`)
