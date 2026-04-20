#!/usr/bin/env tsx
/**
 * Audit script: find city slugs that collide across different countries.
 *
 * This is the exact class of bug that caused /vegan-places/united-kingdom/oxford
 * to render Oxford NZ — the city_slug 'oxford' exists in both UK and NZ rows of
 * the directory_cities view, and a `.eq('city_slug', slug).single()` silently
 * returned the wrong one.
 *
 * Run this periodically to discover new collisions (e.g. after big imports)
 * and sanity-check that every ambiguous slug resolves correctly via the
 * country-scoped lookup.
 *
 * Usage:
 *   tsx scripts/audit-city-slug-collisions.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function slugifyCountry(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function main() {
  console.log('Loading all directory_cities rows...')
  const bySlug: Record<string, Array<{ city: string; country: string; count: number }>> = {}
  const PAGE = 1000
  let off = 0
  while (true) {
    const { data, error } = await supabase
      .from('directory_cities')
      .select('city, country, city_slug, place_count')
      .range(off, off + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const r of data) {
      const s = (r as any).city_slug
      if (!s) continue
      const arr = bySlug[s] ?? []
      arr.push({ city: (r as any).city, country: (r as any).country, count: (r as any).place_count })
      bySlug[s] = arr
    }
    off += data.length
    if (data.length < PAGE) break
  }
  const total = Object.keys(bySlug).length
  const collisions = Object.entries(bySlug).filter(([_, v]) => v.length > 1)
  console.log(`\nScanned ${total} distinct city slugs — ${collisions.length} have collisions (city in > 1 country).\n`)

  if (collisions.length === 0) {
    console.log('No collisions. All directory-cities city_slug values are unique globally.')
    return
  }

  // Show top collisions
  collisions.sort((a, b) => {
    const aMax = Math.max(...a[1].map(r => r.count))
    const bMax = Math.max(...b[1].map(r => r.count))
    return bMax - aMax
  })

  console.log('Top 20 colliding slugs (biggest city first):')
  for (const [slug, rows] of collisions.slice(0, 20)) {
    console.log(`  ${slug}:`)
    for (const r of rows.sort((a, b) => b.count - a.count)) {
      console.log(`    ${r.count.toString().padStart(4)} places  |  ${r.city}, ${r.country}`)
    }
  }

  // Now for each collision, verify that resolving by (country_slug, city_slug)
  // actually returns the right row.
  console.log('\nResolution check: (country_slug, city_slug) → correct row?')
  let broken = 0
  for (const [slug, rows] of collisions.slice(0, 50)) {
    for (const r of rows) {
      const countrySlug = slugifyCountry(r.country)
      const { data: rows } = await supabase
        .from('directory_cities')
        .select('city, country, place_count')
        .eq('city_slug', slug)
        .ilike('country', r.country)
        .order('place_count', { ascending: false })
        .limit(1)
      const data = rows?.[0]
      if (!data || data.country !== r.country) {
        broken++
        console.log(`  ✗ ${countrySlug}/${slug} resolved to ${data?.country ?? '(nothing)'} — expected ${r.country}`)
      }
    }
  }
  if (broken === 0) console.log('  ✓ All resolutions correct with country-scoped lookup.')

  console.log(`\nIf any new code paths do .eq('city_slug', X).single() WITHOUT .ilike('country', Y), they will silently return the wrong city for any of the ${collisions.length} colliding slugs above.`)
}

main().catch(e => { console.error(e); process.exit(1) })
