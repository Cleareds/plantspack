#!/usr/bin/env tsx
/**
 * Detect likely duplicates in our places DB.
 * Two places matched to the SAME foursquare_id are almost certainly duplicates.
 *
 * Per CLAUDE.md rules: NEVER delete. Only produce a report.
 * Output: logs/duplicates.jsonl — one JSON group per line.
 *
 * Admin can review and manually merge/delete after confirming.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { writeFileSync } from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const PAGE = 1000
  let off = 0
  const byFsqId = new Map<string, any[]>()

  while (true) {
    const { data, error } = await supabase
      .from('places')
      .select('id, name, city, country, slug, source, vegan_level, created_at, foursquare_id, foursquare_data')
      .not('foursquare_id', 'is', null)
      .order('id', { ascending: true })
      .range(off, off + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break

    for (const p of data) {
      const arr = byFsqId.get(p.foursquare_id!) ?? []
      if (arr.some(r => r.id === p.id)) continue
      arr.push(p)
      byFsqId.set(p.foursquare_id!, arr)
    }
    off += data.length
    if (data.length < PAGE) break
  }

  const dupes: any[] = []
  for (const [fsqId, rows] of byFsqId) {
    if (rows.length < 2) continue
    dupes.push({
      fsq_id: fsqId,
      fsq_name: (rows[0].foursquare_data as any)?.name,
      count: rows.length,
      places: rows.map(r => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        city: r.city,
        country: r.country,
        source: r.source,
        vegan_level: r.vegan_level,
        created_at: r.created_at,
      })),
    })
  }

  writeFileSync('logs/duplicates.jsonl', dupes.map(d => JSON.stringify(d)).join('\n'))
  console.log(`Found ${dupes.length} duplicate groups (same foursquare_id on multiple places)`)
  console.log(`Total affected rows: ${dupes.reduce((s, d) => s + d.count, 0)}`)
  console.log('\nTop 10 groups:')
  for (const d of dupes.slice(0, 10)) {
    console.log(`\n  [${d.count}×] FSQ "${d.fsq_name}" (${d.fsq_id})`)
    for (const p of d.places) {
      console.log(`    - ${p.name} | ${p.city} | ${p.source} | ${p.id}`)
    }
  }
  console.log('\nReport: logs/duplicates.jsonl')
  console.log('NO ROWS DELETED. Admin must review + merge manually.')
}

main().catch(e => { console.error(e); process.exit(1) })
