#!/usr/bin/env tsx
/**
 * FSQ discovery adapter → place_staging.
 *
 * Reads `logs/fsq-discover-candidates.jsonl` (produced by
 * `scripts/foursquare-discover.ts`), de-dupes by `fsq_place_id`, runs each row
 * through the Tier-1 hard filter (src/lib/places/quality-gate.ts), and upserts
 * into `place_staging`.
 *
 * IMPORTANT (per user directive, 2026-04-18):
 *   Even rows that fail Tier-1 are written to staging with `decision='reject'`
 *   and `decision_reason=<rule>`. We never drop candidates. A later pass (e.g.
 *   Google Places verification once budget allows) can re-evaluate the reject
 *   pool without re-scraping.
 *
 * Usage:
 *   tsx scripts/fsq-candidates-to-staging.ts --limit=500     # dry-run sample
 *   tsx scripts/fsq-candidates-to-staging.ts --commit         # full dataset, write
 *   tsx scripts/fsq-candidates-to-staging.ts --commit --limit=500
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { hardFilter, DEFAULT_CONFIG } from '../src/lib/places/quality-gate'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const args = process.argv.slice(2)
const commit = args.includes('--commit')
const limit = Number(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 0)
const CANDIDATES_FILE = 'logs/fsq-discover-candidates.jsonl'
const SOURCE_TAG = 'foursquare-discover-2026-04-18'

// FSQ returns ISO country codes; our canonical list uses full names.
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
  PE: 'Peru', UY: 'Uruguay', EC: 'Ecuador', ZA: 'South Africa', EG: 'Egypt',
  NG: 'Nigeria', KE: 'Kenya', MA: 'Morocco',
}

function resolveCountry(iso: string | null, fallback: string | null): string | null {
  if (iso) {
    const c = FSQ_COUNTRY_ISO[iso.toUpperCase()]
    if (c) return c
  }
  return fallback
}

function cleanWebsite(w: string | null): string | null {
  if (!w) return null
  const t = w.trim()
  if (!t) return null
  return /^https?:\/\//i.test(t) ? t.replace(/\/+$/, '') : 'https://' + t.replace(/\/+$/, '')
}

interface StagingRow {
  source: string
  source_id: string
  raw: unknown
  name: string
  latitude: number
  longitude: number
  city: string | null
  country: string | null
  address: string | null
  website: string | null
  phone: string | null
  categories: string[]
  date_refreshed: string | null
  required_fields_ok: boolean
  freshness_ok: boolean
  chain_filtered: boolean
  decision: 'pending' | 'reject'
  decision_reason: string | null
}

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'}${limit ? ` (limit ${limit})` : ''}`)

  // Load and dedup candidates by fsq_place_id (the discovery file may have dupes
  // across cities — same place found from neighboring city searches).
  const raw = readFileSync(CANDIDATES_FILE, 'utf-8')
  const lines = raw.split('\n').filter(l => l.trim())
  const byFsqId = new Map<string, any>()
  for (const line of lines) {
    try {
      const d = JSON.parse(line)
      if (d.fsq_place_id && !byFsqId.has(d.fsq_place_id)) byFsqId.set(d.fsq_place_id, d)
    } catch {}
  }
  console.log(`Loaded ${lines.length} lines → ${byFsqId.size} unique candidates`)

  const target = limit > 0 ? Array.from(byFsqId.values()).slice(0, limit) : Array.from(byFsqId.values())

  // Build staging rows + apply Tier-1 gate
  const rows: StagingRow[] = []
  const stats = { accepted: 0, rejected: 0 }
  const byReason: Record<string, number> = {}
  for (const c of target) {
    const country = resolveCountry(c.fsq_country, c.country_search)
    const city = c.fsq_locality || c.city_search || null
    const website = cleanWebsite(c.website)
    const gateInput = {
      name: c.name,
      latitude: c.lat,
      longitude: c.lng,
      city, country, address: c.address,
      website, date_refreshed: c.date_refreshed,
      categories: c.categories,
    }
    const gate = hardFilter(gateInput, DEFAULT_CONFIG)

    const reason = gate.reject
    if (reason) {
      stats.rejected++
      byReason[reason] = (byReason[reason] ?? 0) + 1
    } else stats.accepted++

    rows.push({
      source: SOURCE_TAG,
      source_id: c.fsq_place_id,
      raw: c,
      name: String(c.name ?? '').slice(0, 200),
      latitude: c.lat,
      longitude: c.lng,
      city,
      country,
      address: c.address ?? null,
      website,
      phone: c.tel ?? null,
      categories: c.categories ?? [],
      date_refreshed: c.date_refreshed ?? null,
      required_fields_ok: gate.required_fields_ok,
      freshness_ok: gate.freshness_ok,
      chain_filtered: gate.chain_filtered,
      decision: reason ? 'reject' : 'pending',
      decision_reason: reason,
    })
  }

  console.log(`\n=== ADAPTER RESULT ===`)
  console.log(`Target: ${target.length}`)
  console.log(`Accepted (pending Tier 2): ${stats.accepted} (${((stats.accepted / target.length) * 100).toFixed(1)}%)`)
  console.log(`Rejected at Tier 1: ${stats.rejected}`)
  console.log(`By reject reason:`)
  for (const [k, v] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(30)} ${v}`)
  }

  if (!commit) {
    console.log('\n(dry-run — rerun with --commit to persist)')
    return
  }

  // Bulk upsert in 500-row batches; ON CONFLICT (source, source_id) → skip
  // (staging rows don't get rewritten once set — re-running is a no-op for
  // already-staged items so discovery changes don't clobber operator actions).
  console.log(`\nUpserting ${rows.length} rows to place_staging...`)
  const BATCH = 500
  let written = 0, failed = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error, data } = await supabase
      .from('place_staging')
      .upsert(chunk, { onConflict: 'source,source_id', ignoreDuplicates: true })
      .select('id')
    if (error) {
      failed += chunk.length
      if (failed <= 500) console.error(`batch err at ${i}: ${error.message}`)
    } else {
      written += data?.length ?? 0
    }
    if ((i + BATCH) % 2000 === 0 || i + BATCH >= rows.length) {
      console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length} (written=${written} failed=${failed})`)
    }
  }
  console.log(`\nDone. Written ${written}, failed ${failed} (already-staged rows are silently skipped by upsert).`)
}

main().catch(e => { console.error(e); process.exit(1) })
