import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  // 1) All Belgium city values, raw, including any variations
  const { data: cities } = await sb.from('places').select('city').eq('country','Belgium').is('archived_at', null).not('city','is',null)
  const m = new Map<string, number>()
  for (const r of cities || []) m.set(r.city!, (m.get(r.city!) || 0) + 1)
  // Show Ostend, Liège, Ypres exact-match
  for (const k of ['Ostend','Oostende','Liège','LièGe','Liege','Liége','Ypres','Ieper']) {
    console.log(`  raw exact "${k}": ${m.get(k) || 0}`)
  }
  console.log()
  // 2) Anything starting with these?
  console.log('All Belgian cities containing "iege" or "liege":')
  for (const [c, n] of m.entries()) {
    if (c.toLowerCase().includes('iege') || c.toLowerCase().includes('liege')) console.log(`  "${c}" = ${n}`)
  }
  console.log()
  // 3) Check region city_names
  const { data: regions } = await sb.from('country_regions').select('region_name, city_names').eq('country_slug','belgium')
  for (const r of regions || []) {
    const cn = r.city_names as string[]
    const has = ['Ostend','Oostende','Liège','LièGe','Liege','Ypres','Ieper'].filter(c => cn.includes(c))
    console.log(`  region "${r.region_name}" includes: ${has.join(', ') || 'none of the targets'}`)
  }
}
main()
