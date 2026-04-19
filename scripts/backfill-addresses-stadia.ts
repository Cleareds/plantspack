#!/usr/bin/env tsx
/**
 * Second-pass address backfill via Stadia Maps (Pelias-backed reverse geocoding).
 *
 * Runs only on rows tagged `address-backfill-miss` — rows where the first-pass
 * Nominatim lookup didn't return a road + city. Stadia's geocoder blends OSM +
 * GeoNames + Who's On First and typically resolves ~30-50% of Nominatim misses.
 *
 * No 1 req/s throttle (Stadia's rate limit is much higher on paid/trial),
 * so this pass runs ~10× faster than the Nominatim one.
 *
 * Usage:
 *   tsx scripts/backfill-addresses-stadia.ts              # dry-run
 *   tsx scripts/backfill-addresses-stadia.ts --commit     # persist
 *   tsx scripts/backfill-addresses-stadia.ts --limit=50
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { appendFileSync, writeFileSync } from 'fs'

dotenv.config({ path: '.env.local' })

const STADIA_KEY = process.env.NEXT_PUBLIC_STADIA_KEY || process.env.STADIA_KEY
if (!STADIA_KEY) {
  console.error('Missing NEXT_PUBLIC_STADIA_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const commit = process.argv.includes('--commit')
const limit = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 0)
const concurrency = Number(process.argv.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? 10)

const REPORT_FILE = 'logs/address-backfill-stadia.jsonl'
const UA = 'PlantsPack-AddressBackfill-Stadia/1.0 (+https://plantspack.com)'

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

interface StadiaFeature {
  properties: {
    housenumber?: string
    street?: string
    postalcode?: string
    locality?: string          // city equivalent in Pelias
    region?: string
    country?: string
    label?: string
    confidence?: number
    accuracy?: string
    layer?: string
  }
}

interface StadiaResp {
  features?: StadiaFeature[]
}

async function reverseGeocodeStadia(lat: number, lng: number): Promise<StadiaResp | null> {
  const url = `https://api.stadiamaps.com/geocoding/v1/reverse?api_key=${STADIA_KEY}&point.lat=${lat}&point.lon=${lng}&size=1`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) return null
    return (await res.json()) as StadiaResp
  } catch {
    return null
  }
}

function buildAddress(f: StadiaFeature): string | null {
  const p = f.properties
  if (!p) return null
  const street = p.street
  const locality = p.locality
  // Require at least street + locality to qualify.
  if (!street || !locality) return null
  const line1 = p.housenumber ? `${street} ${p.housenumber}` : street
  const line2 = p.postalcode ? `${p.postalcode} ${locality}` : locality
  return `${line1}, ${line2}`.trim()
}

async function loadBatch(batchSize: number): Promise<Place[]> {
  const { data, error } = await supabase
    .from('places')
    .select('id, name, latitude, longitude, address, city, country, tags')
    .is('archived_at', null)
    .contains('tags', ['address-backfill-miss'])
    .not('tags', 'cs', '{address-backfilled-stadia}')
    .not('tags', 'cs', '{address-backfill-miss-stadia}')
    .limit(batchSize)
  if (error) throw error
  return (data as Place[]) ?? []
}

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'} · concurrency=${concurrency}${limit ? ` · limit ${limit}` : ''}`)
  writeFileSync(REPORT_FILE, '')

  const stats = { processed: 0, backfilled: 0, missed: 0 }
  const HARD_CAP = limit > 0 ? limit : Infinity
  const BATCH = 200

  while (stats.processed < HARD_CAP) {
    const take = Math.min(BATCH, HARD_CAP - stats.processed)
    let rows: Place[]
    try {
      rows = await loadBatch(take)
    } catch (e: any) {
      console.error(`load err: ${e.message} — retrying in 10s`)
      await new Promise(r => setTimeout(r, 10000))
      continue
    }
    if (rows.length === 0) break

    // Parallel workers at higher concurrency than Nominatim allowed.
    let idx = 0
    async function worker() {
      while (true) {
        const i = idx++
        if (i >= rows.length) return
        const p = rows[i]
        stats.processed++

        const resp = await reverseGeocodeStadia(p.latitude, p.longitude)
        if (!resp || !resp.features || resp.features.length === 0) {
          stats.missed++
          if (commit) {
            const tags = [...(p.tags ?? []), 'address-backfill-miss-stadia']
            await supabase.from('places').update({ tags }).eq('id', p.id)
          }
          continue
        }

        const newAddr = buildAddress(resp.features[0])
        if (!newAddr) {
          stats.missed++
          appendFileSync(REPORT_FILE, JSON.stringify({ id: p.id, name: p.name, reason: 'no_street_or_locality' }) + '\n')
          if (commit) {
            const tags = [...(p.tags ?? []), 'address-backfill-miss-stadia']
            await supabase.from('places').update({ tags }).eq('id', p.id)
          }
          continue
        }

        stats.backfilled++
        appendFileSync(REPORT_FILE, JSON.stringify({ id: p.id, name: p.name, old: p.address, new: newAddr }) + '\n')

        if (commit) {
          const tags = (p.tags ?? [])
            .filter(t => t !== 'address-backfill-miss' && t !== 'address-placeholder')
            .concat('address-backfilled-stadia')
          const update: Record<string, unknown> = { address: newAddr, tags }
          const stadiaLocality = resp.features[0].properties.locality
          const stadiaCountry = resp.features[0].properties.country
          if (stadiaLocality && (!p.city || p.city.length < 2)) update.city = stadiaLocality
          if (stadiaCountry && (!p.country || p.country.length < 2)) update.country = stadiaCountry
          const { error } = await supabase.from('places').update(update).eq('id', p.id)
          if (error) console.error(`  update err ${p.id}: ${error.message}`)
        }

        if (stats.processed % 50 === 0) {
          console.log(`  processed=${stats.processed}  backfilled=${stats.backfilled}  missed=${stats.missed}`)
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()))

    if (!commit) break
  }

  console.log('\n=== STADIA BACKFILL ===')
  console.log(stats)
  console.log(`Report: ${REPORT_FILE}`)
  if (!commit) console.log('\n(dry-run — rerun with --commit to persist)')
}

main().catch(e => { console.error(e); process.exit(1) })
