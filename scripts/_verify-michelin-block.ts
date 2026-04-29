import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('posts').select('content').eq('id','6a99e298-3a35-46b8-b091-a7e5fee32dcb').single()
  const lines = (data?.content as string).split('\n')
  console.log('Line 26 (De Nieuwe Winkel block):')
  console.log(lines[25])
}
main()
