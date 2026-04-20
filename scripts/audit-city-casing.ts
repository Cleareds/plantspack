#!/usr/bin/env tsx
/**
 * Find city casing/accent variants that produce duplicate rows in
 * directory_cities for the same (country, slug). These are the cities
 * where `.maybeSingle()` returns null due to multi-match, which is the
 * class of bug that kept Paris / Montreal / New Delhi from resolving
 * correctly before the collision fix.
 *
 * Output: list of canonical name + variants + affected place counts.
 * Does NOT mutate data. Dry-run only.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function normalize(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

async function main() {
  console.log('Loading all directory_cities rows...')
  const rows: Array<{ city: string; country: string; place_count: number; city_slug: string }> = []
  const PAGE = 1000
  let off = 0
  while (true) {
    const { data, error } = await supabase
      .from('directory_cities')
      .select('city, country, place_count, city_slug')
      .range(off, off + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    rows.push(...(data as any))
    off += data.length
    if (data.length < PAGE) break
  }

  // Group by (country, normalized_city). Anything with > 1 variant is a dup.
  const groups: Record<string, typeof rows> = {}
  for (const r of rows) {
    if (!r.city || !r.country) continue
    const key = `${r.country}|||${normalize(r.city)}`
    ;(groups[key] ??= []).push(r)
  }

  const dups = Object.entries(groups).filter(([, v]) => v.length > 1)
  console.log(`\n${rows.length} directory rows → ${dups.length} casing/accent dup clusters.\n`)

  // Show biggest first (by total place count across variants).
  dups.sort((a, b) => {
    const aTotal = a[1].reduce((s, r) => s + r.place_count, 0)
    const bTotal = b[1].reduce((s, r) => s + r.place_count, 0)
    return bTotal - aTotal
  })

  console.log('Top 40 clusters (canonical → variants):')
  let totalPlacesAffected = 0
  for (const [, variants] of dups.slice(0, 40)) {
    variants.sort((a, b) => b.place_count - a.place_count)
    const canonical = variants[0]
    const siblings = variants.slice(1)
    const siblingTotal = siblings.reduce((s, r) => s + r.place_count, 0)
    totalPlacesAffected += siblingTotal
    console.log(
      `  ${canonical.city}, ${canonical.country} (${canonical.place_count})  ←  ${siblings
        .map(s => `"${s.city}" (${s.place_count})`)
        .join(', ')}`
    )
  }

  const totalSiblings = dups.reduce((s, [, v]) => s + v.reduce((s2, r) => s2 + r.place_count, 0) - Math.max(...v.map(r => r.place_count)), 0)
  console.log(`\n${dups.length} clusters → ~${totalSiblings} places will be re-pointed to their canonical city name.`)
}

main().catch(e => { console.error(e); process.exit(1) })
