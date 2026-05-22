import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const names = ['Vêm da Terra','Café com Propósito','Clara Clariôu','Padaria Verderosa','Sr. Shiitake','VegRosas']
for (const n of names) {
  const { data } = await sb.from('places').select('slug,main_image_url').eq('country','Brazil').ilike('name',`%${n.split(' ')[0]}%`).is('archived_at',null).limit(2)
  console.log(`${n}: ${(data||[]).map(r=>`${r.slug}${r.main_image_url?'(img)':'(no-img)'}`).join(', ')}`)
}
