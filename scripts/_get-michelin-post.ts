import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('posts').select('id,title,content').eq('id','6a99e298-3a35-46b8-b091-a7e5fee32dcb').single()
  console.log('TITLE:', data?.title)
  // Print first 200 chars of each block containing img tags or image markdown
  const content = data?.content as string
  // Find all image markdown instances
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    if (line.includes('![') || line.includes('<img') || line.includes('image_url')) {
      console.log(`Line ${i}: ${line.substring(0, 200)}`)
    }
  })
}
main()
