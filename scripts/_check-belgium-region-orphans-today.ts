import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  // 1) Cities with mixed casing
  for (const target of ['Zaventem', 'Liège', 'LièGe', 'Liege', 'Louvain-la-Neuve', 'Louvain-La-Neuve', 'Wavre', 'Waterloo', 'Mons', 'Namur', 'Charleroi']) {
    const { count } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('country','Belgium').is('archived_at', null).eq('city', target)
    if (count && count > 0) console.log(`  city="${target}" count=${count}`)
  }
  console.log()
  // 2) Region city_names
  const { data: regions } = await sb.from('country_regions').select('region_name, city_names').eq('country_slug','belgium').order('sort_order')
  for (const r of regions || []) {
    const cn = r.city_names as string[]
    const has = ['Zaventem','Liège','LièGe','Louvain-la-Neuve','Louvain-La-Neuve','Wavre','Waterloo'].filter(c => cn.includes(c))
    console.log(`  region "${r.region_name}" includes targets: ${has.join(', ') || 'none'}  (total ${cn.length})`)
  }
}
main()
