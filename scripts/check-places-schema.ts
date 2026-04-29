import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { count } = await supabase.from('places').select('*', { count: 'exact', head: true })
  console.log('Total places:', count)

  const { data: sample } = await supabase
    .from('places')
    .select('*')
    .limit(3)

  console.log('\nColumns:', Object.keys(sample?.[0] ?? {}).sort())
  console.log('\nSample rows:')
  for (const row of sample ?? []) {
    console.log({
      id: row.id,
      name: row.name,
      lat: row.latitude,
      lng: row.longitude,
      city: row.city,
      country: row.country,
      source: row.source,
      vegan_level: row.vegan_level,
      permanently_closed: row.permanently_closed,
    })
  }

  const { data: bySource } = await supabase.rpc('count_by_source').catch(() => ({ data: null }))
  if (!bySource) {
    const { data } = await supabase.from('places').select('source')
    const counts: Record<string, number> = {}
    for (const r of data ?? []) counts[r.source ?? 'null'] = (counts[r.source ?? 'null'] ?? 0) + 1
    console.log('\nBy source:', counts)
  }
}

main().catch(console.error)
