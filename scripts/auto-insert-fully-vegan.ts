#!/usr/bin/env tsx
/**
 * Auto-insert strict 100% vegan candidates from `place_staging` into `places`.
 *
 * Filter (all must be true):
 *   - decision          = 'auto_import'    (passed Tier-2 quality gate)
 *   - vegan_level       = 'fully_vegan'    (classifier said strict vegan)
 *   - vegan_confidence  ≥ 0.85             (strong evidence — 100% vegan phrase,
 *                                           schema.org servesCuisine=Vegan, or
 *                                           OSM diet:vegan=only)
 *   - operator_action   IS NULL            (not yet triaged by admin)
 *   - imported_place_id IS NULL            (not yet imported)
 *
 * Everything else (vegan_friendly, lower-confidence fully_vegan, needs_review,
 * reject) stays in staging for manual admin review via /admin/staging.
 *
 * Imported places land with:
 *   vegan_level           = 'fully_vegan'
 *   verification_status   = 'automated'          (not admin_verified — banner still shows)
 *   tags                  = ['auto-inserted-fully-vegan', <source>]
 *   is_verified           = false                (community can still help verify)
 *
 * Safe to re-run — uses UNIQUE (source, source_id) on places + imported_place_id
 * tracking on staging; already-imported rows are skipped.
 *
 * Usage:
 *   tsx scripts/auto-insert-fully-vegan.ts                     # dry-run report
 *   tsx scripts/auto-insert-fully-vegan.ts --commit            # persist
 *   tsx scripts/auto-insert-fully-vegan.ts --commit --minScore=65
 *   tsx scripts/auto-insert-fully-vegan.ts --commit --minConfidence=0.90
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { detectCategory } from '../src/lib/places/categorize'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const args = process.argv.slice(2)
const commit = args.includes('--commit')
const minConfidence = Number(args.find(a => a.startsWith('--minConfidence='))?.split('=')[1] ?? 0.85)
const minScore = Number(args.find(a => a.startsWith('--minScore='))?.split('=')[1] ?? 0)
const ADMIN_USER_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

interface StagingRow {
  id: string
  source: string
  source_id: string
  name: string
  latitude: number
  longitude: number
  city: string | null
  country: string | null
  address: string | null
  website: string | null
  phone: string | null
  categories: string[] | null
  vegan_level: string | null
  vegan_confidence: number | null
  quality_score: number | null
  website_signal: any
}

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'} · minConfidence=${minConfidence}${minScore > 0 ? ` · minScore=${minScore}` : ''}`)

  // Pull every qualifying row.
  const PAGE = 1000
  let off = 0
  const rows: StagingRow[] = []
  while (true) {
    let q = supabase
      .from('place_staging')
      .select('id, source, source_id, name, latitude, longitude, city, country, address, website, phone, categories, vegan_level, vegan_confidence, quality_score, website_signal')
      .eq('decision', 'auto_import')
      .eq('vegan_level', 'fully_vegan')
      .gte('vegan_confidence', minConfidence)
      .is('operator_action', null)
      .is('imported_place_id', null)
      .order('quality_score', { ascending: false, nullsFirst: false })
      .range(off, off + PAGE - 1)
    if (minScore > 0) q = q.gte('quality_score', minScore)
    const { data, error } = await q
    if (error) throw error
    if (!data || data.length === 0) break
    rows.push(...(data as StagingRow[]))
    off += data.length
    if (data.length < PAGE) break
  }
  console.log(`Qualifying candidates: ${rows.length}`)

  // Country / score breakdown for sanity-check.
  const byCountry: Record<string, number> = {}
  const scoreBuckets: Record<string, number> = { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 }
  for (const r of rows) {
    byCountry[r.country ?? 'Unknown'] = (byCountry[r.country ?? 'Unknown'] ?? 0) + 1
    const s = r.quality_score ?? 0
    const bucket = s >= 90 ? '90-100' : s >= 80 ? '80-89' : s >= 70 ? '70-79' : s >= 60 ? '60-69' : '<60'
    scoreBuckets[bucket]++
  }
  console.log('\nScore buckets:', scoreBuckets)
  console.log('\nTop 10 countries:')
  for (const [c, n] of Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${c.padEnd(30)} ${n}`)
  }

  if (rows.length === 0) { console.log('\nNothing to insert.'); return }

  // Sample preview
  console.log('\nSample (first 10):')
  for (const r of rows.slice(0, 10)) {
    console.log(`  score=${r.quality_score}  conf=${r.vegan_confidence?.toFixed(2)}  · ${r.name} (${r.city}, ${r.country})`)
  }

  if (!commit) {
    console.log('\n(dry-run — rerun with --commit to insert)')
    return
  }

  // Build places rows + insert in batches.
  const nowIso = new Date().toISOString()
  const placeRows = rows.map(row => {
    const cat = detectCategory({
      name: row.name,
      fsqCategoryNames: row.categories ?? [],
    })
    return {
      name: String(row.name).slice(0, 200),
      address: row.address || row.city || row.country || 'Unknown',
      city: row.city,
      country: row.country,
      latitude: row.latitude,
      longitude: row.longitude,
      phone: row.phone,
      website: row.website,
      vegan_level: 'fully_vegan' as const,
      source: row.source,
      source_id: row.source_id,
      foursquare_id: row.source.startsWith('foursquare-') ? row.source_id : null,
      foursquare_status: row.source.startsWith('foursquare-') ? 'matched' : null,
      foursquare_checked_at: row.source.startsWith('foursquare-') ? nowIso : null,
      foursquare_data: row.website_signal,
      category: cat.category,
      categorization_note: cat.note,
      tags: ['auto-inserted-fully-vegan', row.source],
      is_verified: false,
      verification_status: 'automated',
      created_by: ADMIN_USER_ID,
    }
  })

  const BATCH = 100
  let inserted = 0, failed = 0
  console.log(`\nInserting ${placeRows.length} rows into places...`)
  for (let i = 0; i < placeRows.length; i += BATCH) {
    const chunk = placeRows.slice(i, i + BATCH)
    const stagingIds = rows.slice(i, i + BATCH).map(r => r.id)
    const { data: ins, error: insErr } = await supabase.from('places').insert(chunk).select('id')
    if (insErr) {
      failed += chunk.length
      if (failed <= 200) console.error(`  batch err at ${i}: ${insErr.message}`)
      continue
    }
    // Link each inserted place back to its staging row (1:1 by order).
    for (let j = 0; j < (ins?.length ?? 0); j++) {
      const stagingId = stagingIds[j]
      const placeId = ins![j].id
      await supabase.from('place_staging').update({
        operator_action: 'approved',
        operator_user_id: ADMIN_USER_ID,
        operator_note: `auto-insert-fully-vegan (conf≥${minConfidence})`,
        operator_decided_at: nowIso,
        imported_place_id: placeId,
        updated_at: nowIso,
      }).eq('id', stagingId)
      inserted++
    }
    if ((i + BATCH) % 500 === 0 || i + BATCH >= placeRows.length) {
      console.log(`  ${Math.min(i + BATCH, placeRows.length)}/${placeRows.length}  inserted=${inserted}  failed=${failed}`)
    }
  }
  console.log(`\nDone. Inserted ${inserted}, failed ${failed}.`)
}

main().catch(e => { console.error(e); process.exit(1) })
