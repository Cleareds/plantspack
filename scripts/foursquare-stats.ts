import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { count: total } = await supabase.from('places').select('*', { count: 'exact', head: true })
  const { count: checked } = await supabase.from('places').select('*', { count: 'exact', head: true }).not('foursquare_checked_at', 'is', null)

  const statuses = ['matched', 'weak_match', 'no_match', 'permanently_closed', 'error']
  const rows: any[] = []
  for (const s of statuses) {
    const { count } = await supabase.from('places').select('*', { count: 'exact', head: true }).eq('foursquare_status', s)
    rows.push({ status: s, count })
  }

  console.log(`Total places:     ${total}`)
  console.log(`Checked:          ${checked} (${((checked! / total!) * 100).toFixed(1)}%)`)
  console.log('By status:')
  console.table(rows)

  const { data: samples } = await supabase
    .from('places')
    .select('name, city, country, foursquare_status, foursquare_data')
    .not('foursquare_checked_at', 'is', null)
    .limit(5)
  console.log('\nSample checked rows:')
  for (const r of samples ?? []) {
    console.log(`  [${r.foursquare_status}] ${r.name} (${r.city}) → ${(r.foursquare_data as any)?.name ?? '—'}`)
  }
}

main().catch(console.error)
