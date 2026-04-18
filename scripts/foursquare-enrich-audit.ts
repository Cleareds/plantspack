#!/usr/bin/env tsx
/**
 * Sanity-check the enrichment candidates: show what we'd fill and from what
 * FSQ match (name similarity + distance). Useful before running --commit.
 *
 * Writes logs/enrich-audit.jsonl (one JSON per line).
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { writeFileSync } from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function isEmpty(v: any): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
}

async function main() {
  const PAGE = 1000
  let off = 0
  const rows: any[] = []
  const byScore = { '1.0': 0, '0.9': 0, '0.8': 0, '0.75': 0 }

  while (true) {
    const { data, error } = await supabase
      .from('places')
      .select('id, name, city, country, website, phone, address, foursquare_data')
      .eq('foursquare_status', 'matched')
      .range(off, off + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break

    for (const p of data) {
      const fsq = p.foursquare_data as any
      if (!fsq) continue
      const updates: string[] = []
      if (isEmpty(p.website) && fsq.website) updates.push('website')
      if (isEmpty(p.phone) && fsq.tel) updates.push('phone')
      if (isEmpty(p.address) && fsq.address) updates.push('address')
      if (updates.length === 0) continue

      const score = Number(fsq.score ?? 0)
      const bucket = score >= 1.0 ? '1.0' : score >= 0.9 ? '0.9' : score >= 0.8 ? '0.8' : '0.75'
      byScore[bucket]++

      rows.push({
        name: p.name,
        city: p.city,
        fsq_name: fsq.name,
        score: score.toFixed(2),
        dist_m: fsq.distance_m?.toFixed(0),
        will_fill: updates,
        fsq_website: fsq.website,
        fsq_tel: fsq.tel,
      })
    }
    off += data.length
    if (data.length < PAGE) break
  }

  writeFileSync('logs/enrich-audit.jsonl', rows.map(r => JSON.stringify(r)).join('\n'))
  console.log(`Total enrich candidates: ${rows.length}`)
  console.log('By score bucket:', byScore)

  const lowScore = rows.filter(r => Number(r.score) < 0.85)
  console.log(`\n${lowScore.length} have score < 0.85 (higher risk of wrong match):`)
  for (const r of lowScore.slice(0, 20)) {
    console.log(`  "${r.name}" (${r.city}) → "${r.fsq_name}" sim=${r.score} dist=${r.dist_m}m fill=${r.will_fill.join(',')}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
