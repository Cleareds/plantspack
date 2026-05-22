import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { error } = await sb.from('places').update({ archived_at: new Date().toISOString(), verification_method: 'brazil-permanently-closed-2026-05-22' }).eq('slug','veg-tal-caruaru-caruaru')
console.log(error?error.message:'✓ Veg & Tal Caruaru archived (closed after ~15 years per Instagram)')
