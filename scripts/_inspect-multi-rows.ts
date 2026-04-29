import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  for (const name of ['Planta Maestra', 'El Naturista']) {
    const { data } = await sb
      .from('places')
      .select('id, name, address, vegan_level, latitude, longitude, source, source_id, website')
      .eq('city', 'Santiago').eq('country', 'Chile').ilike('name', name)
    console.log(`\n=== ${name} ===`)
    for (const r of data || []) {
      console.log(`  [${r.id}]`)
      console.log(`    name: ${r.name}`)
      console.log(`    addr: ${r.address || '∅'}`)
      console.log(`    lvl:  ${r.vegan_level}`)
      console.log(`    coord: ${r.latitude}, ${r.longitude}`)
      console.log(`    src:  ${r.source} / ${r.source_id ?? '∅'}`)
      console.log(`    web:  ${r.website ?? '∅'}`)
    }
  }
}
main()
