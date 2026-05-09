import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const id = '9080a35e-de99-4495-bf0e-8f9a7dbe2dea'
  const { error } = await sb.from('places').update({
    archived_at: new Date().toISOString(),
    archived_reason: 'permanently closed (per admin 2026-05-09)',
    updated_at: new Date().toISOString(),
  }).eq('id', id).select('name, city').maybeSingle()
  console.log(error ? error.message : 'archived Veni Vidi Vegan (Charleroi) - was the only fully_vegan in Charleroi')
}
main()
