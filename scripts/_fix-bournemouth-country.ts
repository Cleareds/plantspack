import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const ids = ['74768800-4d74-4686-9f37-e13ed76c286b', '839bfe0f-83a9-434e-8907-603bca8057d4']
  const { error } = await sb.from('places')
    .update({ country: 'United Kingdom' })
    .in('id', ids)
  console.log('Fix result:', error ?? 'OK - 2 places updated to United Kingdom')
}
main()
