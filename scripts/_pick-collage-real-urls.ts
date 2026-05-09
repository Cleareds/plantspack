import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const slugs = [
    'plates-london','morris-bella-amsterdam','sereda-vegan-point-kiev',
    'forrest-friends-diest','the-greenhouse-spa-retreat-saltash','adele-forme-vegane-ravenna',
  ]
  for (const s of slugs) {
    const variants = [s, s.replace('plates','plates-restaurant')]
    for (const v of variants) {
      const { data } = await sb.from('places').select('slug, name, main_image_url').eq('slug', v).maybeSingle()
      if (data?.main_image_url) { console.log(`${data.slug}\t${data.main_image_url}`); break }
    }
  }
}
main()
