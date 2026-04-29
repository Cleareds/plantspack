import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('posts').select('id,content').eq('id','6a99e298-3a35-46b8-b091-a7e5fee32dcb').single()
  const content = data?.content as string
  const lines = content.split('\n')
  // Print line 25 in full (no truncation)
  console.log('LINE 26 FULL:')
  console.log(lines[25])
  console.log('\nLINE 38 FULL:')
  console.log(lines[37])
}
main()
