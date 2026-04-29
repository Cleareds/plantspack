import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await sb
    .from('places')
    .select('id, name, address, source, website, latitude, longitude')
    .eq('city', 'Santiago').eq('country', 'Chile').eq('vegan_level', 'fully_vegan')
    .order('source', { ascending: true })
  console.log(`Remaining fully_vegan in Santiago: ${data?.length}`)
  console.log('---')
  for (const p of data || []) {
    console.log(`${p.name}`)
    console.log(`  id:   ${p.id}`)
    console.log(`  addr: ${p.address || '∅'}`)
    console.log(`  src:  ${p.source}`)
    console.log(`  web:  ${p.website ?? '∅'}`)
    console.log()
  }
}
main()
