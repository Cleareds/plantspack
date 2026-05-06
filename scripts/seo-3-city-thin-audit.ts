/**
 * How many city pages will be noindexed by the new <5 places rule?
 * Read-only.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
dotenv.config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  // Aggregate via the directory_cities view if it counts; otherwise scan.
  let last = '00000000-0000-0000-0000-000000000000'
  const counts = new Map<string, number>()
  while (true) {
    const { data, error } = await sb
      .from('places')
      .select('id, city, country')
      .is('archived_at', null)
      .gt('id', last)
      .order('id')
      .limit(1000)
    if (error) throw error
    if (!data?.length) break
    for (const r of data as any[]) {
      if (!r.city || !r.country) continue
      const k = `${r.city}|${r.country}`
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    last = (data[data.length - 1] as any).id
    if (data.length < 1000) break
  }

  let small = 0
  let large = 0
  for (const c of counts.values()) {
    if (c < 5) small++
    else large++
  }
  const out = {
    total_cities: counts.size,
    indexable_cities: large,
    noindex_cities: small,
    pct_noindex: ((small / counts.size) * 100).toFixed(1) + '%',
  }
  console.log(JSON.stringify(out, null, 2))
  fs.writeFileSync(path.join(process.cwd(), 'scripts', 'seo-out', 'city-thin-audit.json'), JSON.stringify(out, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
