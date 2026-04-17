/**
 * Seeds city_populations from public/data/city-populations.json,
 * refreshes the city_scores materialized view, and prints verification output.
 * Safe to re-run (uses upsert).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedPopulations() {
  const path = join(process.cwd(), 'public/data/city-populations.json')
  const data: Record<string, number> = JSON.parse(readFileSync(path, 'utf-8'))
  const rows = Object.entries(data)
    .map(([key, pop]) => {
      const [city, country] = key.split('|||')
      return { city, country, population: pop, source: 'geonames' }
    })
    .filter(r => r.city && r.country && r.population > 0)

  console.log(`Seeding ${rows.length} city_populations rows...`)
  const batchSize = 500
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase.from('city_populations').upsert(batch, { onConflict: 'city,country' })
    if (error) throw error
    process.stdout.write(`  ${Math.min(i + batchSize, rows.length)}/${rows.length}\r`)
  }
  console.log(`\nSeeded ${rows.length} populations.`)
}

async function refreshAndVerify() {
  console.log('Refreshing materialized views...')
  const t0 = Date.now()
  const { error: refreshErr } = await supabase.rpc('refresh_directory_views')
  if (refreshErr) throw refreshErr
  console.log(`Refresh completed in ${Date.now() - t0}ms.`)

  const { count: totalCities } = await supabase.from('city_scores').select('*', { count: 'exact', head: true })
  console.log(`Total cities in city_scores: ${totalCities}`)

  const { data: dist } = await supabase.from('city_scores').select('grade').limit(10000)
  const hist: Record<string, number> = {}
  dist?.forEach((r: any) => { hist[r.grade] = (hist[r.grade] || 0) + 1 })
  console.log('Grade distribution:', hist)

  const { data: top } = await supabase.from('city_scores')
    .select('city, country, score, grade, place_count, fv_count, vf_count, accessibility, choice, variety, quality')
    .order('score', { ascending: false })
    .limit(20)

  console.log('\nTop 20 cities:')
  top?.forEach((r: any, i: number) => {
    console.log(`  ${(i + 1).toString().padStart(3)}. ${r.city}, ${r.country} — ${r.score} (${r.grade}) — ${r.place_count}pl ${r.fv_count}fv ${r.vf_count}vf — acc${r.accessibility}/ch${r.choice}/va${r.variety}/qu${r.quality}`)
  })
}

async function main() {
  await seedPopulations()
  await refreshAndVerify()
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
