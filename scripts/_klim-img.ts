import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  for (const slug of ['klimzaal-blok-antwerp','dreamcatchers-ghent','het-strand-leuven','life-bar-leuven','pepas-leuven','tabi-loo-leuven']) {
    const { data } = await sb.from('places').select('main_image_url').eq('slug', slug).maybeSingle()
    if (data?.main_image_url) console.log(`${slug}\t${data.main_image_url}`)
  }
}
main()
