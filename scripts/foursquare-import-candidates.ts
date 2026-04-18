#!/usr/bin/env tsx
/**
 * Import Foursquare discovery candidates into places.
 *
 * Reads logs/fsq-discover-candidates.jsonl (from foursquare-discover.ts) and
 * inserts new rows with:
 *   - source = 'foursquare-discover-YYYY-MM-DD'
 *   - vegan_level = 'vegan_friendly' (conservative — FSQ category is mixed
 *     vegan+vegetarian; community verifies via amber banner)
 *   - verification_status = 'unverified'
 *   - categorization_note from detectCategory()
 *   - tags: ['fsq-discovered', 'needs-verification']
 *
 * Safety:
 *   - Re-checks DB for fsq_place_id and spatial match before inserting (dedup
 *     against anything that was added between discovery + import).
 *   - Skips if address cannot be derived (uses city/country fallback).
 *   - Batches in 100s for throughput.
 *
 * Usage:
 *   tsx scripts/foursquare-import-candidates.ts           # dry-run
 *   tsx scripts/foursquare-import-candidates.ts --commit  # persist
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { similarityLev, distanceM, neighborGridKeys, toGridKey, cleanWebsite, isChainName } from '../src/lib/places/matching'
import { detectCategory } from '../src/lib/places/categorize'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const commit = process.argv.includes('--commit')

const SOURCE_TAG = 'foursquare-discover-2026-04-17'
const ADMIN_USER_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const CANDIDATES_FILE = 'logs/fsq-discover-candidates.jsonl'

interface Candidate {
  fsq_place_id: string
  name: string
  lat: number
  lng: number
  address: string | null
  city_search: string
  country_search: string
  fsq_locality: string | null
  fsq_country: string | null
  categories: string[]
  website: string | null
  tel: string | null
}

// Map FSQ ISO country codes to our canonical names.
const FSQ_COUNTRY_ISO: Record<string, string> = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom', UK: 'United Kingdom',
  DE: 'Germany', FR: 'France', IT: 'Italy', ES: 'Spain', NL: 'Netherlands',
  AT: 'Austria', BE: 'Belgium', PT: 'Portugal', PL: 'Poland', CZ: 'Czechia',
  CH: 'Switzerland', SE: 'Sweden', DK: 'Denmark', NO: 'Norway', FI: 'Finland',
  IE: 'Ireland', GR: 'Greece', HU: 'Hungary', RO: 'Romania', HR: 'Croatia',
  SI: 'Slovenia', SK: 'Slovakia', BG: 'Bulgaria', LT: 'Lithuania', LV: 'Latvia',
  EE: 'Estonia', IS: 'Iceland', LU: 'Luxembourg', MT: 'Malta', CY: 'Cyprus',
  AU: 'Australia', NZ: 'New Zealand', JP: 'Japan', KR: 'South Korea',
  CN: 'China', TW: 'Taiwan', HK: 'Hong Kong', SG: 'Singapore', TH: 'Thailand',
  VN: 'Vietnam', PH: 'Philippines', ID: 'Indonesia', MY: 'Malaysia',
  IN: 'India', IL: 'Israel', AE: 'United Arab Emirates', TR: 'Turkey',
  MX: 'Mexico', BR: 'Brazil', AR: 'Argentina', CL: 'Chile', CO: 'Colombia',
  PE: 'Peru', UY: 'Uruguay', EC: 'Ecuador', ZA: 'South Africa',
}

function resolveCountry(iso: string | null, fallback: string): string {
  if (iso) {
    const c = FSQ_COUNTRY_ISO[iso.toUpperCase()]
    if (c) return c
  }
  return fallback
}

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'}`)

  // Load candidates
  const raw = readFileSync(CANDIDATES_FILE, 'utf-8').trim()
  const candidates: Candidate[] = raw.split('\n').map(line => JSON.parse(line))
  console.log(`Loaded ${candidates.length} candidates from ${CANDIDATES_FILE}`)

  // Build dedup index of our current DB (re-check since discovery may have
  // been done a while ago).
  console.log('Loading our DB for dedup...')
  const existingFsq = new Set<string>()
  const grid = new Map<string, Array<{ name: string; lat: number; lng: number }>>()
  const PAGE = 1000
  let off = 0
  while (true) {
    const { data, error } = await supabase
      .from('places')
      .select('name, latitude, longitude, foursquare_id')
      .not('latitude', 'is', null)
      .is('archived_at', null)
      .order('id', { ascending: true })
      .range(off, off + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const p of data) {
      if (p.foursquare_id) existingFsq.add(p.foursquare_id)
      const k = toGridKey(p.latitude!, p.longitude!)
      const arr = grid.get(k) ?? []
      arr.push({ name: p.name, lat: p.latitude!, lng: p.longitude! })
      grid.set(k, arr)
    }
    off += data.length
    if (data.length < PAGE) break
  }
  console.log(`Existing fsq_ids: ${existingFsq.size}, grid cells: ${grid.size}`)

  // Build unique-by-fsq_place_id set (candidates file may have duplicates
  // across cities).
  const byFsqId = new Map<string, Candidate>()
  for (const c of candidates) if (!byFsqId.has(c.fsq_place_id)) byFsqId.set(c.fsq_place_id, c)
  console.log(`Unique by fsq_place_id: ${byFsqId.size}`)

  // Filter + build row payloads
  const toInsert: any[] = []
  const skipped = { existingFsqId: 0, spatialDupe: 0, chain: 0, noCountry: 0, noName: 0 }

  for (const c of byFsqId.values()) {
    if (existingFsq.has(c.fsq_place_id)) { skipped.existingFsqId++; continue }
    if (!c.name?.trim()) { skipped.noName++; continue }
    if (isChainName(c.name)) { skipped.chain++; continue }

    // Re-run spatial dedup
    let matched = false
    for (const key of neighborGridKeys(c.lat, c.lng)) {
      const cell = grid.get(key)
      if (!cell) continue
      for (const p of cell) {
        const d = distanceM(c.lat, c.lng, p.lat, p.lng)
        if (d > 150) continue
        const s = similarityLev(c.name, p.name)
        if (s >= 0.80) { matched = true; break }
      }
      if (matched) break
    }
    if (matched) { skipped.spatialDupe++; continue }

    const country = resolveCountry(c.fsq_country, c.country_search)
    if (!country) { skipped.noCountry++; continue }
    const city = c.fsq_locality || c.city_search

    const cat = detectCategory({
      name: c.name,
      fsqCategoryNames: c.categories,
    })

    const addr = c.address || city || country

    toInsert.push({
      name: c.name.slice(0, 200),
      address: addr,
      city,
      country,
      latitude: c.lat,
      longitude: c.lng,
      phone: c.tel || null,
      website: cleanWebsite(c.website),
      vegan_level: 'vegan_friendly' as const,
      source: SOURCE_TAG,
      source_id: c.fsq_place_id,
      foursquare_id: c.fsq_place_id,
      foursquare_status: 'matched',
      foursquare_checked_at: new Date().toISOString(),
      foursquare_data: {
        name: c.name,
        categories: c.categories.map(name => ({ name })),
        address: addr,
        website: c.website,
        tel: c.tel,
        score: 1.0,
        distance_m: 0,
      },
      category: cat.category,
      categorization_note: cat.note,
      tags: ['fsq-discovered', 'needs-verification'],
      is_verified: false,
      verification_status: 'unverified',
      created_by: ADMIN_USER_ID,
    })
  }

  console.log(`\n=== IMPORT SUMMARY ===`)
  console.log(`Candidates to insert: ${toInsert.length}`)
  console.log(`Skipped:`, skipped)

  const byCountry: Record<string, number> = {}
  const byCategory: Record<string, number> = {}
  for (const r of toInsert) {
    byCountry[r.country] = (byCountry[r.country] ?? 0) + 1
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1
  }
  const topCountries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 15)
  console.log('\nBy country (top 15):')
  for (const [c, n] of topCountries) console.log(`  ${c.padEnd(30)} ${n}`)
  console.log('\nBy category:', byCategory)

  if (!commit) {
    console.log('\n(dry-run — rerun with --commit to persist)')
    return
  }

  // Batch insert
  const BATCH = 100
  let imported = 0, failed = 0
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const chunk = toInsert.slice(i, i + BATCH)
    const { error, data } = await supabase.from('places').insert(chunk).select('id')
    if (error) {
      failed += chunk.length
      if (failed <= 5) console.error(`batch err at ${i}: ${error.message}`)
    } else {
      imported += data?.length ?? chunk.length
    }
    if ((i + BATCH) % 500 === 0 || i + BATCH >= toInsert.length) {
      console.log(`  ${Math.min(i + BATCH, toInsert.length)}/${toInsert.length} (imported=${imported} failed=${failed})`)
    }
  }
  console.log(`\nDone. imported=${imported} failed=${failed}`)
}

main().catch(e => { console.error(e); process.exit(1) })
