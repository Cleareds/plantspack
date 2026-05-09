import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  for (const q of ['Sereda','Greenhouse Spa']) {
    const { data } = await sb.from('places').select('slug, name, city, main_image_url').ilike('name', `%${q}%`).limit(3)
    for (const r of data || []) console.log(`${r.slug}\t${r.name} (${r.city})\t${r.main_image_url}`)
  }
}
main()
