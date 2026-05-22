import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await sb.from('places').select('slug,name,website,main_image_url').eq('country','Brazil').eq('vegan_level','fully_vegan').is('archived_at',null).is('main_image_url',null)
const withWeb = data.filter(r => r.website && /^https?:/.test(r.website))
console.log(`Brazil FV missing image: ${data.length}`)
console.log(`  Of those, with website: ${withWeb.length}`)
console.log(`  Without website (Instagram/FB only): ${data.length - withWeb.length}`)
