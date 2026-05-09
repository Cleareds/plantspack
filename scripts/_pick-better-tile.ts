import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  // Photogenic fully-vegan places we have. Filter Supabase-hosted (reliable).
  for (const slug of ['humus-x-hortense-ixelles','le-botaniste-brussels','le-botaniste-gent','spritz-antwerpen','tabi-loo-leuven','mildreds-london','flower-burger-roma','flower-burger-milano','flower-burger-marseille','tofu-vegan-london-3','klimzaal-blok-antwerp','soul-kitchen-gent','have-a-roll-ghent-ghent','de-salopette-gent']) {
    const { data } = await sb.from('places').select('slug, name, city, main_image_url').eq('slug', slug).maybeSingle()
    if (data?.main_image_url) console.log(`${slug.padEnd(35)} ${data.main_image_url.slice(0,90)}`)
  }
}
main()
