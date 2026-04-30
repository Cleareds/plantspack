// Coverage audit: current PlantsPack place counts by country, identifying
// territories where we have thin coverage and OSM likely has more.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: countries, error } = await sb
    .from('directory_countries')
    .select('country, place_count, fully_vegan_count, eat_count, store_count, hotel_count')
    .order('place_count', { ascending: false })
  if (error) throw error

  console.log(`Total countries with places: ${countries?.length ?? 0}`)

  // Bucket by place_count
  const buckets: Record<string, any[]> = {
    'Strong (>500)': [],
    'Decent (100-500)': [],
    'Thin (20-100)': [],
    'Sparse (5-20)': [],
    'Almost-missing (<5)': [],
  }
  for (const c of countries || []) {
    const n = c.place_count
    if (n > 500) buckets['Strong (>500)'].push(c)
    else if (n >= 100) buckets['Decent (100-500)'].push(c)
    else if (n >= 20) buckets['Thin (20-100)'].push(c)
    else if (n >= 5) buckets['Sparse (5-20)'].push(c)
    else buckets['Almost-missing (<5)'].push(c)
  }
  for (const [k, v] of Object.entries(buckets)) {
    console.log(`\n${k}: ${v.length} countries`)
    for (const c of v) console.log(`  ${c.place_count.toString().padStart(5)}  ${c.country}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
