import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('posts').select('id,content').eq('id','6a99e298-3a35-46b8-b091-a7e5fee32dcb').single()
  const content = data?.content as string
  const lines = content.split('\n')
  // Print lines 25-55 (first two place blocks)
  lines.slice(24, 60).forEach((line, i) => {
    console.log(`${i+25}: ${line.substring(0, 300)}`)
  })
}
main()
