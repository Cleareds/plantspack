import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('posts').select('id,content,images,image_urls').eq('id','6a99e298-3a35-46b8-b091-a7e5fee32dcb').single()
  const content = data?.content as string
  const lines = content.split('\n')
  console.log('TOTAL LINES:', lines.length)
  console.log('\n--- IMAGES FIELD ---')
  console.log(JSON.stringify(data?.images))
  console.log('\n--- IMAGE_URLS FIELD ---')
  console.log(JSON.stringify(data?.image_urls))
  console.log('\n--- LINE 100-160 ---')
  lines.slice(99, 160).forEach((line, i) => {
    console.log(`${i+100}: ${line.substring(0, 400)}`)
  })
}
main()
