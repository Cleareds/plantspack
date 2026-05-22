import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await sb.from('posts').select('*').ilike('slug','%beyond-berlin%')
console.log('err:', error?.message, 'count:', data?.length)
if (data?.[0]) {
  console.log('cols:', Object.keys(data[0]).join(', '))
  const r = data[0]
  console.log(`\nslug: ${r.slug}\nprivacy: ${r.privacy}\nfeatured_image_url: ${r.featured_image_url}\nupdated_at: ${r.updated_at}\ncategory: ${r.category}\ntags: ${JSON.stringify(r.secondary_tags||r.tags)}`)
  console.log('\n---CONTENT---')
  console.log(r.content)
}
