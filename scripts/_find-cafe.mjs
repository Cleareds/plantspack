import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await sb.from('places').select('slug,name,city').eq('country','Brazil').ilike('name','%Propósito%').is('archived_at',null)
console.log('Propósito:', data)
const { data: d2 } = await sb.from('places').select('slug,name,city').eq('country','Brazil').ilike('name','%Café com%').is('archived_at',null)
console.log('Café com:', d2)
