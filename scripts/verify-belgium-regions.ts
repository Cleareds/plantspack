/**
 * Post-migration verification for country_regions (Belgium seed).
 *
 * Run after applying 20260501000000_country_regions.sql:
 *   npx tsx scripts/verify-belgium-regions.ts
 *
 * Checks:
 *   1. The 3 Belgium regions exist with the expected slugs.
 *   2. Per-region place totals + fully-vegan counts.
 *   3. Per-region city coverage: how many of the seeded city_names actually
 *      appear in places (and how many are dead entries).
 *   4. Belgium cities NOT assigned to any region (orphans). These miss the
 *      back-link banner today; a follow-up reseed should add them.
 *   5. Cities double-assigned to multiple regions (should be 0).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const env = readFileSync('.env.local', 'utf8')
  const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)![1].trim()
  const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)![1].trim()
  const sb = createClient(url, key)

  console.log('=== Belgium country_regions verification ===\n')

  // 1. Regions exist
  const { data: regions, error: rErr } = await sb
    .from('country_regions')
    .select('country_slug, region_slug, region_name, sort_order, city_names')
    .eq('country_slug', 'belgium')
    .order('sort_order')
  if (rErr) { console.error('FAIL: cannot read country_regions:', rErr.message); process.exit(1) }
  if (!regions || regions.length === 0) {
    console.error('FAIL: no Belgium regions found. Did the migration run?')
    process.exit(1)
  }
  const expected = new Set(['brussels-capital', 'flanders', 'wallonia'])
  const actual = new Set(regions.map(r => r.region_slug))
  for (const slug of expected) {
    if (!actual.has(slug)) console.error(`FAIL: missing region "${slug}"`)
  }
  console.log(`✓ Regions present: ${regions.map(r => r.region_slug).join(', ')}\n`)

  // 2 + 3. Per-region: places, fully_vegan, city coverage
  const { data: bePlaces } = await sb
    .from('places')
    .select('city, vegan_level')
    .eq('country', 'Belgium')
    .is('archived_at', null)
    .limit(20000)
  const placesByCity: Record<string, { total: number; fv: number }> = {}
  for (const p of bePlaces || []) {
    const c = p.city || ''
    if (!c) continue
    placesByCity[c] ||= { total: 0, fv: 0 }
    placesByCity[c].total++
    if (p.vegan_level === 'fully_vegan') placesByCity[c].fv++
  }

  const cityToRegions: Record<string, string[]> = {}
  let regionTotal = 0
  let regionFv = 0

  console.log('region                  | cities_seeded | cities_with_data | places | fully_vegan')
  console.log('------------------------|---------------|------------------|--------|------------')
  for (const r of regions) {
    let places = 0, fv = 0, withData = 0
    for (const cn of r.city_names) {
      cityToRegions[cn] ||= []
      cityToRegions[cn].push(r.region_slug)
      const stats = placesByCity[cn]
      if (stats) {
        withData++
        places += stats.total
        fv += stats.fv
      }
    }
    regionTotal += places
    regionFv += fv
    console.log(
      `${r.region_slug.padEnd(23)} | ${String(r.city_names.length).padStart(13)} | ${String(withData).padStart(16)} | ${String(places).padStart(6)} | ${String(fv).padStart(11)}`
    )
  }

  // National totals
  const totalBe = (bePlaces || []).length
  const totalBeFv = (bePlaces || []).filter(p => p.vegan_level === 'fully_vegan').length
  console.log(`\nNational: ${totalBe} places (${totalBeFv} fully vegan) in Belgium`)
  console.log(`Covered:  ${regionTotal} places (${regionFv} fully vegan) across all 3 regions`)
  console.log(`Orphans:  ${totalBe - regionTotal} places in cities not assigned to any region`)

  // 4. Orphan cities
  const orphanCities: { city: string; total: number; fv: number }[] = []
  for (const [city, stats] of Object.entries(placesByCity)) {
    if (!cityToRegions[city]) orphanCities.push({ city, ...stats })
  }
  orphanCities.sort((a, b) => b.total - a.total)
  if (orphanCities.length > 0) {
    console.log(`\nOrphan cities (${orphanCities.length}):`)
    for (const o of orphanCities) {
      console.log(`  ${o.city.padEnd(35)} ${o.total} places (${o.fv} fv)`)
    }
  } else {
    console.log('\n✓ No orphan cities — every Belgium city is in a region.')
  }

  // 5. Double-assigned cities (should be 0)
  const doubles = Object.entries(cityToRegions).filter(([, regs]) => regs.length > 1)
  if (doubles.length > 0) {
    console.log('\nFAIL: cities assigned to multiple regions:')
    for (const [city, regs] of doubles) console.log(`  ${city} → ${regs.join(', ')}`)
  } else {
    console.log('\n✓ No double-assigned cities.')
  }

  // 6. getRegionForCity spot-check (uses GIN contains)
  console.log('\nSpot-check: getRegionForCity()')
  for (const city of ['Brussels', 'Ghent', 'Liège', 'Saint-Josse', 'Berchem']) {
    const { data } = await sb
      .from('country_regions')
      .select('region_slug')
      .eq('country_slug', 'belgium')
      .contains('city_names', [city])
      .maybeSingle()
    console.log(`  ${city.padEnd(20)} → ${data?.region_slug ?? '(none)'}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
