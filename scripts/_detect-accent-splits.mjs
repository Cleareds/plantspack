import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

for (const country of ['Spain', 'Italy']) {
  const rows = []
  let from = 0
  while (true) {
    const { data } = await sb.from('places').select('city,vegan_level').eq('country', country).is('archived_at', null).range(from, from + 999)
    if (!data?.length) break
    rows.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  // group by normalized city
  const groups = {}
  for (const r of rows) {
    const k = norm(r.city)
    if (!k) continue
    if (!groups[k]) groups[k] = {}
    if (!groups[k][r.city]) groups[k][r.city] = { total: 0, fv: 0 }
    groups[k][r.city].total++
    if (r.vegan_level === 'fully_vegan') groups[k][r.city].fv++
  }
  const splits = Object.entries(groups).filter(([, variants]) => Object.keys(variants).length > 1)
  console.log(`\n=== ${country}: ${splits.length} city-name splits ===`)
  for (const [k, variants] of splits) {
    console.log(`  normalized="${k}":`)
    for (const [name, stats] of Object.entries(variants).sort((a, b) => b[1].total - a[1].total)) {
      console.log(`    "${name}": ${stats.total} total, ${stats.fv} FV`)
    }
  }
}
