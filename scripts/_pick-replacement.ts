import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  // Replace Sereda with another fully-vegan place, prefer Supabase-hosted hi-res
  for (const slug of ['lil-bao-brussels','het-strand-leuven','kitsune-burgers-brussels','plant-a-pizza-gent','lucifer-lives-brussels']) {
    const { data } = await sb.from('places').select('slug, name, city, country, main_image_url').eq('slug', slug).maybeSingle()
    if (data?.main_image_url) console.log(`${slug}\t${data.main_image_url}`)
  }
}
main()
