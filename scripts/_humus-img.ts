import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('places').select('main_image_url, images').eq('slug','humus-x-hortense-ixelles').maybeSingle()
  console.log('main:', data?.main_image_url)
  console.log('images:', data?.images)
}
main()
