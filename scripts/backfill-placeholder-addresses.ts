#!/usr/bin/env tsx
/**
 * Reverse-geocode places tagged `address-placeholder` (from audit-osm-quality)
 * via OSM Nominatim — free, no signup, 1 req/s max per their ToS.
 *
 * Writes a real street-line address like "Hauptstraße 12, 10178 Berlin" back
 * to the places row, removes the `address-placeholder` tag, and adds
 * `address-backfilled` for audit.
 *
 * Falls back gracefully: if Nominatim doesn't return a road + city, leaves
 * the row alone (so we don't replace one placeholder with another).
 *
 * Usage:
 *   tsx scripts/backfill-placeholder-addresses.ts              # dry-run
 *   tsx scripts/backfill-placeholder-addresses.ts --commit     # persist
 *   tsx scripts/backfill-placeholder-addresses.ts --limit=50
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { appendFileSync, writeFileSync } from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const commit = process.argv.includes('--commit')
const limit = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 0)

const REPORT_FILE = 'logs/address-backfill.jsonl'
// Nominatim policy: 1 request / second, max. We stay well under.
const DELAY_MS = 1100
const UA = 'PlantsPack-AddressBackfill/1.0 (+https://plantspack.com)'

interface Place {
  id: string
  name: string
  latitude: number
  longitude: number
  address: string | null
  city: string | null
  country: string | null
  tags: string[] | null
}

interface NominatimResp {
  address?: {
    road?: string
    house_number?: string
    pedestrian?: string
    suburb?: string
    neighbourhood?: string
    city?: string
    town?: string
    village?: string
    postcode?: string
    country?: string
  }
  display_name?: string
}

async function reverseGeocode(lat: number, lng: number): Promise<NominatimResp | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'en' },
    })
    if (!res.ok) return null
    return (await res.json()) as NominatimResp
  } catch {
    return null
  }
}

function buildAddress(r: NominatimResp): string | null {
  const a = r.address
  if (!a) return null
  const road = a.road || a.pedestrian
  const nr = a.house_number
  const city = a.city || a.town || a.village || a.suburb || a.neighbourhood
  // Require at least road + city to call it a real address.
  if (!road || !city) return null
  const streetLine = nr ? `${road} ${nr}` : road
  const locLine = a.postcode ? `${a.postcode} ${city}` : city
  return `${streetLine}, ${locLine}`.trim()
}

async function loadBatch(batchSize: number, offset: number): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('id, name, latitude, longitude, address, city, country, tags')
    .is('archived_at', null)
    .contains('tags', ['address-placeholder'])
    .not('tags', 'cs', '{address-backfilled}')
    .not('tags', 'cs', '{address-backfill-miss}')
    .range(offset, offset + batchSize - 1)
  if (error) throw error
  return (data as Place[]) ?? []
}

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'} · rate=1 req/s${limit ? ` · limit ${limit}` : ''}`)
  writeFileSync(REPORT_FILE, '')

  const stats = { processed: 0, backfilled: 0, missed: 0 }
  const HARD_CAP = limit > 0 ? limit : Infinity
  const BATCH = 200

  while (stats.processed < HARD_CAP) {
    const take = Math.min(BATCH, HARD_CAP - stats.processed)
    let rows: Place[]
    try {
      // Always offset 0 — as rows get the `address-backfilled` tag they drop
      // out of the filter.
      rows = await loadBatch(take, 0)
    } catch (e: any) {
      console.error(`load err: ${e.message} — retrying in 10s`)
      await new Promise(r => setTimeout(r, 10000))
      continue
    }
    if (rows.length === 0) break

    // Serial processing — Nominatim throttles at 1 req/s.
    for (const p of rows) {
      stats.processed++
      const resp = await reverseGeocode(p.latitude, p.longitude)
      await new Promise(r => setTimeout(r, DELAY_MS))

      if (!resp) {
        stats.missed++
        if (commit) {
          const tags = [...(p.tags ?? []), 'address-backfill-miss']
          await supabase.from('places').update({ tags }).eq('id', p.id)
        }
        continue
      }

      const newAddr = buildAddress(resp)
      if (!newAddr) {
        stats.missed++
        appendFileSync(REPORT_FILE, JSON.stringify({ id: p.id, name: p.name, reason: 'no_road_or_city' }) + '\n')
        if (commit) {
          const tags = [...(p.tags ?? []), 'address-backfill-miss']
          await supabase.from('places').update({ tags }).eq('id', p.id)
        }
        continue
      }

      stats.backfilled++
      appendFileSync(REPORT_FILE, JSON.stringify({ id: p.id, name: p.name, old: p.address, new: newAddr }) + '\n')

      if (commit) {
        const tags = (p.tags ?? [])
          .filter(t => t !== 'address-placeholder')
          .concat('address-backfilled')
        const update: Record<string, unknown> = { address: newAddr, tags }
        // If our city/country are placeholders themselves, also refresh.
        if (resp.address?.city || resp.address?.town || resp.address?.village) {
          const city = resp.address.city || resp.address.town || resp.address.village
          if (!p.city || p.city.length < 2) update.city = city
        }
        if (resp.address?.country && (!p.country || p.country.length < 2)) {
          update.country = resp.address.country
        }
        const { error } = await supabase.from('places').update(update).eq('id', p.id)
        if (error) console.error(`  update err ${p.id}: ${error.message}`)
      }

      if (stats.processed % 50 === 0) {
        console.log(`  processed=${stats.processed}  backfilled=${stats.backfilled}  missed=${stats.missed}`)
      }
    }

    // If dry-run we'd infinite-loop (nothing drops out of filter), so break.
    if (!commit) break
  }

  console.log('\n=== ADDRESS BACKFILL ===')
  console.log(stats)
  console.log(`Report: ${REPORT_FILE}`)
  if (!commit) console.log('\n(dry-run — rerun with --commit to persist)')
}

main().catch(e => { console.error(e); process.exit(1) })
