#!/usr/bin/env tsx
/**
 * Dump weak_match rows for human review.
 * Writes logs/weak-matches.jsonl — one JSON per line so it's grep-able.
 *
 * For each row: original name/city/addr, FSQ name/addr/website, similarity, distance.
 * Flag suspicious cases where FSQ category suggests non-vegan (e.g., Steakhouse).
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { writeFileSync } from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Category IDs/names that indicate clearly non-vegan places — if FSQ matched
// our "vegan-friendly" place to one of these, the match is probably wrong.
const NON_VEGAN_CATEGORY_RE = /\b(steak|bbq|barbecue|butcher|seafood|fish|meat|chicken|burger king|kfc|mcdonald)\b/i

async function main() {
  const PAGE = 1000
  let off = 0
  const rows: any[] = []
  const flagged: any[] = []

  while (true) {
    const { data, error } = await supabase
      .from('places')
      .select('id, name, city, country, address, vegan_level, foursquare_data')
      .eq('foursquare_status', 'weak_match')
      .range(off, off + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break

    for (const p of data) {
      const fsq = p.foursquare_data as any
      const row = {
        id: p.id,
        name: p.name,
        city: p.city,
        country: p.country,
        our_address: p.address,
        vegan_level: p.vegan_level,
        fsq_name: fsq?.name,
        fsq_address: fsq?.address,
        fsq_categories: (fsq?.categories ?? []).map((c: any) => c.name).join(', '),
        fsq_website: fsq?.website,
        score: fsq?.score,
        distance_m: fsq?.distance_m,
      }
      rows.push(row)

      const catBlob = row.fsq_categories ?? ''
      if (NON_VEGAN_CATEGORY_RE.test(catBlob)) flagged.push(row)
    }

    off += data.length
    if (data.length < PAGE) break
  }

  const lines = rows.map(r => JSON.stringify(r)).join('\n')
  writeFileSync('logs/weak-matches.jsonl', lines)
  console.log(`Wrote ${rows.length} weak matches to logs/weak-matches.jsonl`)
  console.log(`Of those, ${flagged.length} matched to a clearly non-vegan FSQ category — likely mismatches.`)
  if (flagged.length > 0) {
    writeFileSync('logs/weak-matches-nonvegan.jsonl', flagged.map(r => JSON.stringify(r)).join('\n'))
    console.log('Flagged rows written to logs/weak-matches-nonvegan.jsonl')
    console.log('\nTop 10 flagged:')
    for (const f of flagged.slice(0, 10)) {
      console.log(`  ${f.name} (${f.city}) → "${f.fsq_name}" [${f.fsq_categories}] sim=${f.score?.toFixed(2)} dist=${f.distance_m?.toFixed(0)}m`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
