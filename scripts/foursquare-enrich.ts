#!/usr/bin/env tsx
/**
 * Enrich places from matched Foursquare data.
 *
 * Only fills our fields when CURRENT value is null/empty — never overwrites.
 * Fields:
 *   - website   (if ours is null)
 *   - phone     (if ours is null)
 *   - address   (if ours is null)
 *
 * Does NOT touch: name, description, vegan_level, category.
 *
 * Usage:
 *   tsx scripts/foursquare-enrich.ts              # dry run
 *   tsx scripts/foursquare-enrich.ts --commit     # persist
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const commit = process.argv.includes('--commit')

function isEmpty(v: any): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
}

function normalizeWebsite(url: string): string {
  if (!url) return url
  url = url.trim()
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  return url.replace(/\/+$/, '')
}

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'}`)

  const PAGE = 1000
  let offset = 0
  const fills = { website: 0, phone: 0, address: 0 }
  let total = 0

  while (true) {
    const { data, error } = await supabase
      .from('places')
      .select('id, name, website, phone, address, foursquare_status, foursquare_data')
      .eq('foursquare_status', 'matched')
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) { console.error(error); process.exit(1) }
    if (!data || data.length === 0) break

    for (const p of data) {
      total++
      const fsq = p.foursquare_data as any
      if (!fsq) continue
      // Safety threshold: audit showed score<0.85 has ~10-18% bad matches (e.g.
      // "Brixton Pound Cafe" → "Brixton Pound Shop"). Only enrich high-confidence.
      if (typeof fsq.score === 'number' && fsq.score < 0.85) continue
      const updates: any = {}

      if (isEmpty(p.website) && fsq.website) {
        updates.website = normalizeWebsite(fsq.website)
        fills.website++
      }
      if (isEmpty(p.phone) && fsq.tel) {
        updates.phone = fsq.tel.trim()
        fills.phone++
      }
      if (isEmpty(p.address) && fsq.address) {
        updates.address = fsq.address.trim()
        fills.address++
      }

      if (Object.keys(updates).length > 0) {
        if (!commit && total <= 20) {
          console.log(`  [${p.name}] fill: ${Object.keys(updates).join(', ')}`)
        }
        if (commit) {
          await supabase.from('places').update(updates).eq('id', p.id)
        }
      }
    }

    offset += data.length
    if (data.length < PAGE) break
  }

  console.log(`\nReviewed ${total} matched places`)
  console.log(`Fills (website | phone | address): ${fills.website} | ${fills.phone} | ${fills.address}`)
  if (!commit) console.log('(dry-run — rerun with --commit to persist)')
}

main().catch(e => { console.error(e); process.exit(1) })
