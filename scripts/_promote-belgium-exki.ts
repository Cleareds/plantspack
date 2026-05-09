import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  const { data: before } = await sb.from('places').select('id, name, city, vegan_level').eq('country','Belgium').is('archived_at', null).ilike('name','%exki%')
  console.log(`Belgium Exki rows: ${before?.length || 0}`)
  for (const r of before || []) console.log(`  ${r.city.padEnd(15)} ${r.name.padEnd(20)} ${r.vegan_level}`)
  const { error } = await sb.from('places').update({
    vegan_level: 'vegan_friendly',
    updated_at: new Date().toISOString(),
  }).eq('country','Belgium').is('archived_at', null).ilike('name','%exki%').eq('vegan_level','vegan_options')
  console.log('\nUpdate:', error ? error.message : 'OK')
  const { error: rerr } = await sb.rpc('refresh_directory_views')
  console.log('refresh_directory_views:', rerr ? rerr.message : 'OK')
}
main()
