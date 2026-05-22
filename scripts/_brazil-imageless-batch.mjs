import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await sb.from('places').select('slug,name,city').eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).is('main_image_url',null).order('id').limit(30)
for (const r of data) console.log(`${r.slug}\t${r.name}\t${r.city}`)
