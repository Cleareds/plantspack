import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data } = await sb.from('posts').select('id, slug, title, image_url, images').eq('slug','welcome-to-plantspack').maybeSingle()
  console.log(data)
}
main()
