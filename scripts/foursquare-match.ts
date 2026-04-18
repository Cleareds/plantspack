#!/usr/bin/env tsx
/**
 * Cross-check places DB against Foursquare Places API.
 *
 * Strategy per place:
 *   1. GET /places/search?ll=LAT,LNG&radius=150&query=<name-first-2-words>&limit=10
 *   2. Score candidates by (name similarity * 0.7) + (distance score * 0.3)
 *   3. Accept if score >= 0.75 AND distance <= 100m
 *   4. Store fsq_place_id, status, data JSON
 *
 * Usage:
 *   tsx scripts/foursquare-match.ts --limit=100        # dry run 100 places
 *   tsx scripts/foursquare-match.ts --limit=100 --commit
 *   tsx scripts/foursquare-match.ts --all --commit     # full run
 *   tsx scripts/foursquare-match.ts --resume --commit  # skip already-checked
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const FSQ_KEY = process.env.FOURSQUARE_SERVICE_KEY!
const FSQ_API = 'https://places-api.foursquare.com'
const FSQ_VERSION = '2025-06-17'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ----- args -----
const args = process.argv.slice(2)
const limit = Number(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 100)
const runAll = args.includes('--all')
const commit = args.includes('--commit')
const resume = args.includes('--resume')
const verbose = args.includes('--verbose')

// ----- helpers -----
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[''`]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Levenshtein → similarity [0,1]
function similarity(a: string, b: string): number {
  a = normalize(a); b = normalize(b)
  if (a === b) return 1
  if (!a || !b) return 0
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost)
    }
  }
  return 1 - dp[m][n] / Math.max(m, n)
}

// Haversine distance in meters
function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// ----- Foursquare search -----
interface FsqPlace {
  fsq_place_id: string
  name: string
  latitude: number
  longitude: number
  closed_bucket?: string
  date_refreshed?: string
  location?: { formatted_address?: string; country?: string }
  categories?: Array<{ fsq_category_id: string; name: string }>
  website?: string
  tel?: string
}

async function fsqSearch(lat: number, lng: number, name: string): Promise<FsqPlace[]> {
  // use first 2-3 significant words of name as query to let FSQ fuzzy match
  const query = normalize(name).split(' ').filter(w => w.length > 2).slice(0, 3).join(' ') || name
  const url = `${FSQ_API}/places/search?ll=${lat},${lng}&radius=400&query=${encodeURIComponent(query)}&limit=10`
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${FSQ_KEY}`,
      'X-Places-Api-Version': FSQ_VERSION,
      'Accept': 'application/json',
    },
  })
  if (!res.ok) {
    if (res.status === 429) throw new Error('RATE_LIMIT')
    const body = await res.text()
    throw new Error(`FSQ ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = await res.json()
  return json.results ?? []
}

// ----- scoring -----
interface MatchResult {
  status: 'matched' | 'weak_match' | 'no_match' | 'permanently_closed' | 'error'
  fsq: FsqPlace | null
  score: number
  distance: number
  note?: string
}

function scoreMatch(place: { name: string; latitude: number; longitude: number }, candidates: FsqPlace[]): MatchResult {
  if (candidates.length === 0) return { status: 'no_match', fsq: null, score: 0, distance: -1 }

  let best: { c: FsqPlace; score: number; dist: number } | null = null
  for (const c of candidates) {
    const dist = distanceM(place.latitude, place.longitude, c.latitude, c.longitude)
    if (dist > 300) continue
    const nameScore = similarity(place.name, c.name)
    const distScore = Math.max(0, 1 - dist / 300)
    const combined = nameScore * 0.7 + distScore * 0.3
    if (!best || combined > best.score) best = { c, score: combined, dist }
  }

  if (!best) return { status: 'no_match', fsq: null, score: 0, distance: -1 }

  const closed = best.c.closed_bucket && best.c.closed_bucket !== 'VeryLikelyOpen' && best.c.closed_bucket !== 'LikelyOpen'

  if (best.score >= 0.75 && best.dist <= 150) {
    return {
      status: closed ? 'permanently_closed' : 'matched',
      fsq: best.c,
      score: best.score,
      distance: best.dist,
      note: closed ? `FSQ closed_bucket=${best.c.closed_bucket}` : undefined,
    }
  }
  if (best.score >= 0.55 && best.dist <= 300) {
    return { status: 'weak_match', fsq: best.c, score: best.score, distance: best.dist }
  }
  return { status: 'no_match', fsq: null, score: best.score, distance: best.dist }
}

// ----- main -----
async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'}${resume ? ' (resume)' : ''}${runAll ? ' (all)' : ` (limit ${limit})`}`)

  // Paginate (Supabase default cap = 1000). Fetch all matching IDs first.
  async function fetchPage(offset: number, size: number) {
    let q = supabase
      .from('places')
      .select('id, name, latitude, longitude, city, country, source, vegan_level, foursquare_status')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + size - 1)
    if (resume) q = q.is('foursquare_checked_at', null)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  }

  const places: any[] = []
  const PAGE = 1000
  if (!runAll) {
    places.push(...(await fetchPage(0, limit)))
  } else if (resume) {
    // With --resume, committed rows drop out of filter. Always re-fetch from 0.
    // We'll load the full list upfront, because otherwise we'd re-fetch each
    // PAGE after the current PAGE has been committed — but upfront fetch is safer.
    let off = 0
    while (true) {
      const batch = await fetchPage(off, PAGE)
      places.push(...batch)
      if (batch.length < PAGE) break
      off += PAGE
      if (off > 50000) break
    }
  } else {
    let off = 0
    while (true) {
      const batch = await fetchPage(off, PAGE)
      places.push(...batch)
      if (batch.length < PAGE) break
      off += PAGE
      if (off > 50000) break
    }
  }

  console.log(`Processing ${places.length} places...\n`)

  const stats = { matched: 0, weak_match: 0, no_match: 0, permanently_closed: 0, error: 0 }
  const samples: any[] = []

  const CONCURRENCY = 2
  let i = 0
  const startTs = Date.now()
  // Global cooldown: when set to a future ts, all workers wait until then.
  let cooldownUntil = 0

  async function fsqWithRetry(p: any): Promise<FsqPlace[]> {
    const backoffs = [5000, 15000, 45000, 120000] // 5s, 15s, 45s, 2min
    for (let attempt = 0; attempt <= backoffs.length; attempt++) {
      // respect global cooldown
      const wait = cooldownUntil - Date.now()
      if (wait > 0) await new Promise(r => setTimeout(r, wait))
      try {
        return await fsqSearch(p.latitude, p.longitude, p.name)
      } catch (e: any) {
        if (e.message !== 'RATE_LIMIT' || attempt === backoffs.length) throw e
        const delay = backoffs[attempt]
        cooldownUntil = Math.max(cooldownUntil, Date.now() + delay)
      }
    }
    throw new Error('retry_exhausted')
  }

  async function processOne(p: any, idx: number) {
    let result: MatchResult
    try {
      const candidates = await fsqWithRetry(p)
      result = scoreMatch(p, candidates)
    } catch (e: any) {
      result = { status: 'error', fsq: null, score: 0, distance: -1, note: e.message }
    }

    stats[result.status]++

    if (verbose || (idx < 20 && !runAll) || result.status === 'permanently_closed' || result.status === 'error') {
      console.log(`[${idx}] ${result.status.padEnd(18)} ${p.name} (${p.city}) → ${result.fsq?.name ?? '—'} | sim=${result.score.toFixed(2)} dist=${result.distance.toFixed(0)}m`)
    }
    if (samples.length < 50) samples.push({ place: p.name, city: p.city, ...result })

    if (commit) {
      await supabase.from('places').update({
        foursquare_id: result.fsq?.fsq_place_id ?? null,
        foursquare_status: result.status,
        foursquare_checked_at: new Date().toISOString(),
        foursquare_data: result.fsq ? {
          name: result.fsq.name,
          categories: result.fsq.categories,
          address: result.fsq.location?.formatted_address,
          website: result.fsq.website,
          tel: result.fsq.tel,
          closed_bucket: result.fsq.closed_bucket,
          date_refreshed: result.fsq.date_refreshed,
          score: result.score,
          distance_m: result.distance,
        } : { score: result.score, distance_m: result.distance, note: result.note },
      }).eq('id', p.id)
    }
  }

  // run with bounded concurrency + inter-batch pacing to stay under FSQ burst limits
  const INTER_BATCH_MS = 400
  const all = places ?? []
  for (let start = 0; start < all.length; start += CONCURRENCY) {
    const batch = all.slice(start, start + CONCURRENCY)
    await Promise.all(batch.map((p, k) => processOne(p, start + k + 1)))
    i += batch.length
    await new Promise(r => setTimeout(r, INTER_BATCH_MS))
    if (i % 200 === 0) {
      const elapsed = (Date.now() - startTs) / 1000
      const rate = i / elapsed
      const eta = (all.length - i) / rate
      console.log(`  → progress ${i}/${all.length} | ${rate.toFixed(1)} req/s | ETA ${Math.round(eta / 60)}min | matched=${stats.matched} weak=${stats.weak_match} none=${stats.no_match} closed=${stats.permanently_closed} err=${stats.error}`)
    }
  }

  console.log('\n=== SUMMARY ===')
  console.log(stats)
  const total = Object.values(stats).reduce((a, b) => a + b, 0)
  console.log(`Match rate: ${((stats.matched / total) * 100).toFixed(1)}%`)
  console.log(`Weak rate:  ${((stats.weak_match / total) * 100).toFixed(1)}%`)
  console.log(`Closed:     ${stats.permanently_closed}`)

  if (!commit) console.log('\n(dry-run — no DB writes; rerun with --commit to persist)')
}

main().catch(e => { console.error(e); process.exit(1) })
