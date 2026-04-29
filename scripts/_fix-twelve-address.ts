import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('places').select('id,name,address,country').eq('id','839bfe0f-83a9-434e-8907-603bca8057d4').single()
  console.log('Current:', JSON.stringify(data))
  
  const cleanAddress = (data?.address as string).replace(/,?\s*France\s*,?/gi, ',').replace(/,,/g, ',').replace(/^,|,$/g, '').trim()
  console.log('Fixed:', cleanAddress)
  
  const { error } = await sb.from('places').update({ address: cleanAddress }).eq('id','839bfe0f-83a9-434e-8907-603bca8057d4')
  console.log('Update:', error ?? 'OK')
}
main()
