#!/usr/bin/env tsx
/**
 * Discover vegan/vegetarian places on Foursquare that are NOT yet in our DB.
 *
 * Strategy:
 *   1. Load our cities (unique city + country pairs with a few places each).
 *   2. For each city, query FSQ /places/search with:
 *         categories = vegan-and-vegetarian  (id 4bf58dd8d48988d1d3941735)
 *         ll         = city centroid (from avg of our places in that city)
 *         radius     = 5000m
 *         limit      = 50
 *   3. Dedup results against our DB's `foursquare_id` column AND against
 *      any result whose lat/lng + normalized name fuzzy-matches one of our
 *      existing places.
 *   4. Write candidates to logs/fsq-discover-candidates.jsonl for review.
 *
 * Outputs a REPORT only — import step is a separate script once the user
 * approves the preview.
 *
 * Usage:
 *   tsx scripts/foursquare-discover.ts --pilot        # 20 biggest cities only
 *   tsx scripts/foursquare-discover.ts                # all cities (dry-run style)
 *   tsx scripts/foursquare-discover.ts --limit=500    # cap city count
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { writeFileSync, appendFileSync, existsSync, readFileSync } from 'fs'
import { similarityLev, distanceM, neighborGridKeys, toGridKey, isChainName } from '../src/lib/places/matching'

dotenv.config({ path: '.env.local' })

const FSQ_KEY = process.env.FOURSQUARE_SERVICE_KEY!
const FSQ_API = 'https://places-api.foursquare.com'
const FSQ_VERSION = '2025-06-17'

// Vegan and Vegetarian Restaurant
const VEG_CATEGORY_ID = '4bf58dd8d48988d1d3941735'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const args = process.argv.slice(2)
const pilot = args.includes('--pilot')
const limit = Number(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 0)
const resume = args.includes('--resume')
const OUT_FILE = 'logs/fsq-discover-candidates.jsonl'
// Per-query city log so resume knows which cities were already queried (even
// those that returned 0 candidates, which don't appear in the candidates file).
const CITY_LOG_FILE = 'logs/fsq-discover-cities.log'

interface FsqPlace {
  fsq_place_id: string
  name: string
  latitude: number
  longitude: number
  categories?: Array<{ fsq_category_id: string; name: string }>
  location?: { formatted_address?: string; locality?: string; country?: string }
  website?: string
  tel?: string
  date_refreshed?: string
}

async function fsqSearchCategory(lat: number, lng: number): Promise<FsqPlace[]> {
  const url = `${FSQ_API}/places/search?categories=${VEG_CATEGORY_ID}&ll=${lat},${lng}&radius=5000&limit=50`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${FSQ_KEY}`,
      'X-Places-Api-Version': FSQ_VERSION,
      Accept: 'application/json',
    },
  })
  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) throw new Error(`FSQ ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  return json.results ?? []
}

async function main() {
  console.log(`Mode: ${pilot ? 'PILOT (top 20 cities)' : limit ? `LIMITED (${limit} cities)` : 'FULL'}`)

  // 1. Load our cities ranked by place count.
  console.log('Loading cities...')
  const cityCounts = new Map<string, { city: string; country: string; lat: number; lng: number; count: number; latSum: number; lngSum: number }>()
  const PAGE = 1000
  let off = 0
  while (true) {
    const { data, error } = await supabase
      .from('places')
      .select('city, country, latitude, longitude')
      .not('city', 'is', null)
      .not('country', 'is', null)
      .is('archived_at', null)
      .order('id', { ascending: true })
      .range(off, off + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    for (const p of data) {
      const k = `${p.country}|${p.city}`
      const cur = cityCounts.get(k) ?? { city: p.city!, country: p.country!, lat: 0, lng: 0, count: 0, latSum: 0, lngSum: 0 }
      cur.count++
      cur.latSum += p.latitude!
      cur.lngSum += p.longitude!
      cityCounts.set(k, cur)
    }
    off += data.length
    if (data.length < PAGE) break
  }
  for (const c of cityCounts.values()) { c.lat = c.latSum / c.count; c.lng = c.lngSum / c.count }
  const cities = Array.from(cityCounts.values()).sort((a, b) => b.count - a.count)
  console.log(`Loaded ${cities.length} cities`)

  // Resume: skip cities already logged. Also rebuild coverage from the
  // existing candidates file (in case the log got wiped).
  const coveredCities = new Set<string>()
  if (resume) {
    if (existsSync(CITY_LOG_FILE)) {
      for (const line of readFileSync(CITY_LOG_FILE, 'utf-8').split('\n')) {
        if (line.trim()) coveredCities.add(line.trim())
      }
    }
    if (existsSync(OUT_FILE)) {
      for (const line of readFileSync(OUT_FILE, 'utf-8').split('\n')) {
        if (!line.trim()) continue
        try {
          const d = JSON.parse(line)
          if (d.country_search && d.city_search) coveredCities.add(`${d.country_search}|${d.city_search}`)
        } catch {}
      }
    }
    console.log(`Resume: ${coveredCities.size} cities already covered — will skip`)
  }
  const target0 = pilot ? cities.slice(0, 20) : limit ? cities.slice(0, limit) : cities
  const target = resume ? target0.filter(c => !coveredCities.has(`${c.country}|${c.city}`)) : target0
  console.log(`Processing ${target.length} cities${resume ? ' (resume)' : ''}`)

  // 2. Load our existing fsq_ids + spatial index for dedup.
  console.log('Loading our places for dedup...')
  const existingFsq = new Set<string>()
  const grid = new Map<string, Array<{ name: string; lat: number; lng: number }>>()
  off = 0
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

  // 3. Walk target cities, search FSQ, dedup.
  const candidates: any[] = []
  const byCountry: Record<string, number> = {}
  let apiCalls = 0
  let duplicatesByFsqId = 0
  let duplicatesBySpatialMatch = 0
  let chains = 0

  for (let i = 0; i < target.length; i++) {
    const c = target[i]
    let places: FsqPlace[] = []
    try {
      places = await fsqSearchCategory(c.lat, c.lng)
      apiCalls++
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT') {
        console.error(`Rate limit after ${apiCalls} calls — stopping early`)
        break
      }
      console.error(`  err ${c.city}: ${e.message}`)
      continue
    }
    // Log city as covered even on 0-results so resume doesn't re-query.
    appendFileSync(CITY_LOG_FILE, `${c.country}|${c.city}\n`)

    for (const fp of places) {
      // Dedup: existing fsq_id
      if (existingFsq.has(fp.fsq_place_id)) { duplicatesByFsqId++; continue }
      // Dedup: spatial + name fuzzy
      let matched = false
      for (const key of neighborGridKeys(fp.latitude, fp.longitude)) {
        const cell = grid.get(key)
        if (!cell) continue
        for (const p of cell) {
          const d = distanceM(fp.latitude, fp.longitude, p.lat, p.lng)
          if (d > 150) continue
          const s = similarityLev(fp.name, p.name)
          if (s >= 0.80) { matched = true; break }
        }
        if (matched) break
      }
      if (matched) { duplicatesBySpatialMatch++; continue }
      // Chain filter
      if (isChainName(fp.name)) { chains++; continue }

      const cand = {
        fsq_place_id: fp.fsq_place_id,
        name: fp.name,
        lat: fp.latitude,
        lng: fp.longitude,
        address: fp.location?.formatted_address ?? null,
        city_search: c.city,
        country_search: c.country,
        fsq_locality: fp.location?.locality ?? null,
        fsq_country: fp.location?.country ?? null,
        categories: (fp.categories ?? []).map(x => x.name),
        website: fp.website ?? null,
        tel: fp.tel ?? null,
        date_refreshed: fp.date_refreshed ?? null,
      }
      candidates.push(cand)
      // Append-on-success so progress survives crashes/credit exhaustion.
      appendFileSync(OUT_FILE, JSON.stringify(cand) + '\n')
      byCountry[c.country] = (byCountry[c.country] ?? 0) + 1
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  ${i + 1}/${target.length} cities · ${apiCalls} calls · ${candidates.length} candidates so far`)
    }

    // Gentle rate-limit: 1 call every 300ms
    await new Promise(r => setTimeout(r, 300))
  }

  // 4. Candidates were appended live above; no final bulk write needed.
  void writeFileSync  // keep import referenced

  console.log('\n=== DISCOVERY SUMMARY ===')
  console.log(`API calls made: ${apiCalls}`)
  console.log(`New candidates: ${candidates.length}`)
  console.log(`Filtered (already in DB by fsq_id): ${duplicatesByFsqId}`)
  console.log(`Filtered (spatial+name match existing): ${duplicatesBySpatialMatch}`)
  console.log(`Filtered (chain): ${chains}`)
  console.log(`\nCandidates by country (top 15):`)
  const top = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 15)
  for (const [c, n] of top) console.log(`  ${c.padEnd(30)} ${n}`)
  console.log('\nPreview: logs/fsq-discover-candidates.jsonl')

  if (pilot) {
    const avg = candidates.length / Math.max(1, apiCalls)
    const estFullCalls = cities.length
    const estFullCandidates = Math.round(avg * estFullCalls)
    console.log(`\n--- Projection from pilot ---`)
    console.log(`${avg.toFixed(1)} new candidates per city × ${cities.length} cities ≈ ${estFullCandidates.toLocaleString()} total candidates`)
    console.log(`API cost: ${cities.length.toLocaleString()} calls (+ ~${estFullCandidates * 0} for this phase — no per-candidate cost)`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
