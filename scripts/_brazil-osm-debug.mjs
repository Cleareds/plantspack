import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const names = ['Vegacy','Vorixo','Parise','Plant Based Gramado','V² Café','Açougue Vegano','Amo Café','Animalchef','Shiva','Lovinha','Refeitório','Yasai','VeganU','Estômago Café','Casa Septem']
for (const n of names) {
  const { data } = await sb.from('places').select('slug,city,vegan_level,archived_at').eq('country','Brazil').ilike('name',`%${n.split(' ')[0]}%`).limit(3)
  if (data?.length) console.log(`${n.padEnd(20)} → ${data.map(r=>`${r.slug}(${r.archived_at?'ARCH':r.vegan_level})`).join(', ')}`)
}
