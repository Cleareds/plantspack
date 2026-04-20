#!/usr/bin/env tsx
/**
 * Merge casing/accent variants of the same city into one canonical name.
 *
 * For each (country, normalized_city) cluster with > 1 variant in the
 * directory_cities view, pick the most-populous variant as canonical,
 * then UPDATE places SET city=<canonical> WHERE city IN (<siblings>)
 * AND country=<country>.
 *
 * Usage:
 *   tsx scripts/merge-city-casing.ts              # dry-run report
 *   tsx scripts/merge-city-casing.ts --commit     # persist
 *
 * Safe to rerun — idempotent once canonical is picked.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const commit = process.argv.includes('--commit')

function normalize(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'}`)

  const rows: Array<{ city: string; country: string; place_count: number }> = []
  const PAGE = 1000
  let off = 0
  while (true) {
    const { data, error } = await supabase
      .from('directory_cities')
      .select('city, country, place_count')
      .range(off, off + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    rows.push(...(data as any))
    off += data.length
    if (data.length < PAGE) break
  }

  const groups: Record<string, typeof rows> = {}
  for (const r of rows) {
    if (!r.city || !r.country) continue
    const key = `${r.country}|||${normalize(r.city)}`
    ;(groups[key] ??= []).push(r)
  }

  const dups = Object.entries(groups).filter(([, v]) => v.length > 1)
  console.log(`${dups.length} clusters to process\n`)

  let totalUpdated = 0
  let totalFailed = 0
  let rowsAffected = 0

  for (const [key, variants] of dups) {
    variants.sort((a, b) => b.place_count - a.place_count)
    const canonical = variants[0]
    const siblings = variants.slice(1)

    for (const sib of siblings) {
      if (sib.city === canonical.city) continue  // belt-and-braces
      rowsAffected += sib.place_count

      if (!commit) {
        console.log(`  "${sib.city}" → "${canonical.city}"  (${sib.country}, ${sib.place_count} rows)`)
        continue
      }

      const { error, count } = await supabase
        .from('places')
        .update({ city: canonical.city })
        .eq('city', sib.city)
        .eq('country', sib.country)
        .select('*', { count: 'exact', head: true })

      if (error) {
        totalFailed++
        console.error(`  ✗ ${sib.city} → ${canonical.city}: ${error.message}`)
      } else {
        totalUpdated++
        console.log(`  ✓ ${sib.city} → ${canonical.city}  (${count ?? '?'} rows, ${sib.country})`)
      }
    }
  }

  console.log(`\n=== DONE ===`)
  console.log({ clusters: dups.length, rowsAffected, updated: totalUpdated, failed: totalFailed })

  if (commit) {
    console.log('\nRefreshing directory_cities materialized view...')
    const { error } = await supabase.rpc('refresh_directory_views')
    if (error) console.log(`  (view refresh skipped: ${error.message} — will refresh on next cron)`)
    else console.log('  ✓ view refreshed')
  } else {
    console.log('\n(dry-run — rerun with --commit to apply)')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
