#!/usr/bin/env tsx
/**
 * Automatically merge the clearest-cut duplicate pairs. Rules are tight to
 * minimize false positives:
 *
 *   - Exactly 2 rows sharing either `foursquare_id` or `vegguide_id`
 *   - Distance between the two ≤ 75 meters
 *   - Name similarity ≥ 0.80
 *   - Neither row already archived
 *
 * Keeps the older row (earlier created_at), since it usually has more
 * community history (reviews, favorites). Removed row gets
 * archived_at = now, archived_reason = `merged into <keepId>`.
 * References (place_reviews, favorite_places, pack_places, place_corrections)
 * are repointed to the kept row.
 *
 * Anything ambiguous (bigger groups, lower similarity) is left for admin
 * review in the /admin/data-quality "Duplicates" tab.
 *
 * Usage:
 *   tsx scripts/auto-merge-dupes.ts             # dry-run
 *   tsx scripts/auto-merge-dupes.ts --commit
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { similarityLev, distanceM } from '../src/lib/places/matching'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const commit = process.argv.includes('--commit')

interface Row {
  id: string
  name: string
  latitude: number
  longitude: number
  created_at: string
  archived_at: string | null
  foursquare_id: string | null
  vegguide_id: number | null
  tags: string[] | null
  description: string | null
  address: string | null
  phone: string | null
  website: string | null
  main_image_url: string | null
  opening_hours: Record<string, string> | null
  foursquare_data: unknown
  foursquare_status: string | null
  foursquare_checked_at: string | null
  vegguide_checked_at: string | null
  osm_ref: string | null
  happycow_id: string | null
}

async function loadAllWith(col: 'foursquare_id' | 'vegguide_id'): Promise<Row[]> {
  const PAGE = 1000
  let off = 0
  const out: Row[] = []
  // Concurrent writes elsewhere can shift pagination and return a row twice.
  // De-dupe by id to guarantee a given row never appears more than once.
  const seen = new Set<string>()
  while (true) {
    const { data, error } = await supabase
      .from('places')
      .select('id, name, latitude, longitude, created_at, archived_at, foursquare_id, vegguide_id, tags, description, address, phone, website, main_image_url, opening_hours, foursquare_data, foursquare_status, foursquare_checked_at, vegguide_checked_at, osm_ref, happycow_id')
      .not(col, 'is', null)
      .is('archived_at', null)
      .order('id', { ascending: true })
      .range(off, off + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const r of data as Row[]) {
      if (seen.has(r.id)) continue
      seen.add(r.id)
      out.push(r)
    }
    off += data.length
    if (data.length < PAGE) break
  }
  return out
}

function groupBy<T, K>(arr: T[], keyFn: (t: T) => K | null | undefined): Map<K, T[]> {
  const m = new Map<K, T[]>()
  for (const x of arr) {
    const k = keyFn(x)
    if (k == null) continue
    const a = m.get(k) ?? []
    a.push(x)
    m.set(k, a)
  }
  return m
}

const BACKFILL_FIELDS = [
  'description', 'address', 'phone', 'website', 'main_image_url',
  'opening_hours', 'foursquare_id', 'foursquare_data', 'foursquare_status',
  'foursquare_checked_at', 'vegguide_id', 'vegguide_checked_at',
  'osm_ref', 'happycow_id',
] as const

function pickKeepRemove(a: Row, b: Row): [Row, Row] {
  // Prefer older (earlier created_at)
  return a.created_at <= b.created_at ? [a, b] : [b, a]
}

async function mergePair(keep: Row, remove: Row) {
  // Backfill null fields on keep
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const f of BACKFILL_FIELDS) {
    const cur = (keep as any)[f]
    const alt = (remove as any)[f]
    const isEmpty = cur === null || cur === undefined || (typeof cur === 'string' && cur.trim() === '')
    if (isEmpty && alt != null && alt !== '') update[f] = alt
  }
  const mergedTags = Array.from(new Set([...(keep.tags || []), ...(remove.tags || []), 'merged-from-duplicate']))
  update.tags = mergedTags

  const { error: uerr } = await supabase.from('places').update(update).eq('id', keep.id)
  if (uerr) throw new Error(`update keep: ${uerr.message}`)

  for (const { table, column } of [
    { table: 'place_reviews', column: 'place_id' as const },
    { table: 'favorite_places', column: 'place_id' as const },
    { table: 'pack_places', column: 'place_id' as const },
    { table: 'place_corrections', column: 'place_id' as const },
  ]) {
    await supabase.from(table).update({ [column]: keep.id }).eq(column, remove.id)
  }

  const { error: arerr } = await supabase.from('places').update({
    archived_at: new Date().toISOString(),
    archived_reason: `merged into ${keep.id}`,
    updated_at: new Date().toISOString(),
  }).eq('id', remove.id)
  if (arerr) throw new Error(`archive remove: ${arerr.message}`)
}

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'}`)

  console.log('Loading places with foursquare_id...')
  const fsqRows = await loadAllWith('foursquare_id')
  console.log(`  ${fsqRows.length}`)
  console.log('Loading places with vegguide_id...')
  const vgRows = await loadAllWith('vegguide_id')
  console.log(`  ${vgRows.length}`)

  const fsqGroups = groupBy(fsqRows, r => r.foursquare_id)
  const vgGroups = groupBy(vgRows, r => r.vegguide_id)

  const candidates: Array<{ key: string; keep: Row; remove: Row; sim: number; dist: number }> = []
  const skipped: Array<{ key: string; reason: string }> = []

  function evalGroup(key: string, group: Row[]) {
    if (group.length !== 2) { skipped.push({ key, reason: `size=${group.length}` }); return }
    const [a, b] = group
    if (a.id === b.id) { skipped.push({ key, reason: 'same_row_twice' }); return }
    const dist = distanceM(a.latitude, a.longitude, b.latitude, b.longitude)
    const sim = similarityLev(a.name, b.name)
    if (dist > 75) { skipped.push({ key, reason: `dist=${dist.toFixed(0)}m` }); return }
    if (sim < 0.80) { skipped.push({ key, reason: `sim=${sim.toFixed(2)}` }); return }
    const [keep, remove] = pickKeepRemove(a, b)
    candidates.push({ key, keep, remove, sim, dist })
  }

  for (const [k, g] of fsqGroups) evalGroup(`fsq:${k}`, g)
  for (const [k, g] of vgGroups) evalGroup(`vg:${k}`, g)

  console.log(`\nAuto-merge candidates: ${candidates.length}`)
  console.log(`Skipped (needs human review): ${skipped.length}`)
  console.log('\nSample merges:')
  for (const c of candidates.slice(0, 10)) {
    console.log(`  [${c.key}] sim=${c.sim.toFixed(2)} d=${c.dist.toFixed(0)}m : KEEP "${c.keep.name}" (${c.keep.id.slice(0, 8)}) ← "${c.remove.name}" (${c.remove.id.slice(0, 8)})`)
  }

  if (!commit) {
    console.log('\n(dry-run — rerun with --commit to persist)')
    return
  }

  console.log(`\nMerging ${candidates.length} pairs...`)
  let done = 0, failed = 0
  for (const c of candidates) {
    try {
      await mergePair(c.keep, c.remove)
      done++
    } catch (e: any) {
      failed++
      if (failed <= 10) console.error(`  fail ${c.key}: ${e.message}`)
    }
    if (done % 50 === 0) console.log(`  ${done}/${candidates.length}`)
  }
  console.log(`\nDone. Merged ${done}, failed ${failed}. Skipped ${skipped.length} need admin review.`)
}

main().catch(e => { console.error(e); process.exit(1) })
