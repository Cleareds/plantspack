import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const NOW = new Date().toISOString()
const TAG = 'brazil-round2-2026-05-21'
// Bardana Rio: vegan_friendly → fully_vegan (Veganizze confirms 100% vegan)
const { error } = await sb.from('places').update({
  vegan_level: 'fully_vegan', verification_method: TAG, verification_level: 3, last_verified_at: NOW
}).eq('slug','bardana').eq('country','Brazil')
console.log(error?`✗ ${error.message}`:'✓ Bardana Rio → fully_vegan')
