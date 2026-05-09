import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data: r } = await sb.from('places').select('id, name, city, vegan_level, website, phone, opening_hours, description, address, main_image_url, verification_method, verification_level').eq('slug','wabi-sabi-liege').maybeSingle()
  console.log('Current:', { name: r?.name, city: r?.city, vegan_level: r?.vegan_level, verification_method: r?.verification_method, verification_level: r?.verification_level })
  if (!r) return
  const update: any = { updated_at: new Date().toISOString(), last_verified_at: new Date().toISOString() }
  if (!r.website) update.website = 'https://www.wabisabiliege.be'
  if (!r.phone)   update.phone = '+32 479 38 60 44'
  if (!r.opening_hours) update.opening_hours = 'Mo 18:00-21:00; We-Sa 11:30-22:00; Su 12:00-14:00'
  update.address = '9 Boulevard Saucy, 4020 Liège'
  update.description = 'Wabi Sabi is a small Japanese vegan restaurant, bar and boutique in the Outremeuse district of Liège. The kitchen serves ramen, bento, Japanese curry, kitsune udon, and tofu don in an izakaya-inspired setting; the shop side carries Japanese specialty products and tea.'
  update.vegan_level = 'fully_vegan'
  update.verification_level = 3
  update.verification_method = 'admin_review'
  update.subcategory = 'restaurant'
  console.log('Patch:', Object.keys(update))
  const { error } = await sb.from('places').update(update).eq('id', r.id)
  console.log(error ? error.message : 'OK')
}
main()
