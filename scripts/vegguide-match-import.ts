#!/usr/bin/env tsx
/**
 * Cross-check our places DB against VegGuide.org vendor dump, then import
 * vegan-aligned vendors we don't already have.
 *
 * Input: data/vegguide/vendors.json + data/vegguide/locations.json (from vegguide-parse.ts)
 *
 * Filtering (conservative, vegan-first per CLAUDE.md):
 *   - veg_level 5 → fully_vegan (still needs manual verification, imported as vegan_friendly)
 *   - veg_level 4 → vegan_friendly (vegetarian with vegan options)
 *   - skip veg_level 0-3 (too risky, includes omnivore places)
 *   - skip close_date != null (closed)
 *   - require latitude + longitude
 *   - skip Russia (per CLAUDE.md)
 *   - skip chains (hardcoded list)
 *
 * Matching (against our DB):
 *   - haversine distance <= 150m AND name similarity >= 0.75 → linked (write vegguide_id)
 *   - no match → candidate for import
 *
 * Import target:
 *   - vegan_level = 'vegan_friendly' (conservative — admin can promote to fully_vegan after verification)
 *   - source = 'vegguide-import-2026-04-17'
 *
 * Usage:
 *   tsx scripts/vegguide-match-import.ts                # dry run
 *   tsx scripts/vegguide-match-import.ts --commit       # persist linked + new
 *   tsx scripts/vegguide-match-import.ts --commit --link-only    # only link, no imports
 *   tsx scripts/vegguide-match-import.ts --commit --import-only  # only imports, no linking
 */

import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { normalizeCity } from './lib/normalize-city'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const args = process.argv.slice(2)
const commit = args.includes('--commit')
const linkOnly = args.includes('--link-only')
const importOnly = args.includes('--import-only')
const limit = Number(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 0)

const SOURCE_TAG = 'vegguide-import-2026-04-17'
const ADMIN_USER_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

// ----- helpers -----
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, '').replace(/&/g, 'and').replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ').trim()
}

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

function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000, toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Skip chains (sampled from existing admin lists + common vegan-washing chains)
const CHAIN_NAMES = new Set([
  'subway', 'mcdonalds', "mcdonald's", 'starbucks', 'kfc', 'burger king', 'taco bell',
  'chipotle', 'panera', 'panera bread', 'pizza hut', 'dominos', "domino's",
  'dunkin', 'dunkin donuts', 'whole foods', 'whole foods market',
  'trader joes', "trader joe's", 'costco', 'walmart', 'target',
  'wendy\'s', 'wendys', 'shake shack', 'five guys', 'in-n-out',
])

function isChain(name: string): boolean {
  const n = normalize(name)
  for (const c of CHAIN_NAMES) if (n === c || n.startsWith(c + ' ')) return true
  return false
}

function cleanWebsite(w: string | null): string | null {
  if (!w) return null
  w = w.trim()
  if (!w) return null
  if (!/^https?:\/\//i.test(w)) w = 'https://' + w
  return w.replace(/\/+$/, '')
}

// ----- main -----
async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'}  ${linkOnly ? '[link-only]' : importOnly ? '[import-only]' : ''}`)

  const vendors: any[] = JSON.parse(readFileSync('data/vegguide/vendors.json', 'utf-8'))
  const locations: any[] = JSON.parse(readFileSync('data/vegguide/locations.json', 'utf-8'))
  console.log(`Loaded ${vendors.length} vendors, ${locations.length} locations`)

  // Build location hierarchy: walk parents to find country
  const locById = new Map<number, any>()
  for (const l of locations) locById.set(l.location_id, l)
  // Map VegGuide's country names to our canonical ones.
  const COUNTRY_ALIAS: Record<string, string> = {
    'USA': 'United States',
    'Macedonia': 'North Macedonia',
  }
  function countryFor(locId: number): string | null {
    let cur = locById.get(locId)
    let depth = 0
    while (cur && depth < 10) {
      if (cur.is_country === 1 || cur.is_country === true) {
        return COUNTRY_ALIAS[cur.name] ?? cur.name
      }
      if (!cur.parent_location_id) return null
      cur = locById.get(cur.parent_location_id)
      depth++
    }
    return null
  }

  // Filter to import-eligible vendors
  const eligible: any[] = []
  let skipped = { closed: 0, noGeo: 0, lowVeg: 0, russia: 0, chain: 0 }
  for (const v of vendors) {
    const vl = Number(v.veg_level)
    if (vl < 4) { skipped.lowVeg++; continue }
    if (v.close_date) { skipped.closed++; continue }
    if (!v.latitude || !v.longitude) { skipped.noGeo++; continue }
    const country = countryFor(v.location_id)
    if (country && /^(russia|russian federation)$/i.test(country)) { skipped.russia++; continue }
    if (isChain(v.name)) { skipped.chain++; continue }
    v.__country = country
    eligible.push(v)
  }
  console.log(`Eligible: ${eligible.length}`)
  console.log(`Skipped:`, skipped)

  // Fetch our places with coords (paginated)
  console.log('\nLoading our places...')
  const ours: Array<{ id: string; name: string; latitude: number; longitude: number; city: string; vegguide_id: number | null }> = []
  const PAGE = 1000
  let off = 0
  while (true) {
    const { data, error } = await supabase
      .from('places')
      .select('id, name, latitude, longitude, city, vegguide_id')
      .not('latitude', 'is', null)
      .order('id', { ascending: true })
      .range(off, off + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    ours.push(...data as any)
    off += data.length
    if (data.length < PAGE) break
  }
  console.log(`Loaded ${ours.length} of our places with coords`)

  // Build a spatial grid for fast candidate lookup (~0.01° ≈ 1.1 km)
  const GRID = 0.01
  function key(lat: number, lng: number) { return `${Math.floor(lat / GRID)}|${Math.floor(lng / GRID)}` }
  const grid = new Map<string, typeof ours>()
  for (const p of ours) {
    const k = key(p.latitude, p.longitude)
    const arr = grid.get(k) ?? []
    arr.push(p); grid.set(k, arr)
  }

  // Match + classify
  const toLink: Array<{ our: any; vv: any; sim: number; dist: number }> = []
  const toImport: any[] = []
  const alreadyLinked: Set<number> = new Set(ours.filter(p => p.vegguide_id).map(p => p.vegguide_id as number))

  const target = limit > 0 ? eligible.slice(0, limit) : eligible
  for (const v of target) {
    if (alreadyLinked.has(v.vendor_id)) continue
    if (!v.__country) continue
    const lat = v.latitude, lng = v.longitude
    // check 9 grid cells
    const clat = Math.floor(lat / GRID), clng = Math.floor(lng / GRID)
    let best: { our: any; sim: number; dist: number } | null = null
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cell = grid.get(`${clat + dy}|${clng + dx}`)
        if (!cell) continue
        for (const p of cell) {
          const d = distanceM(lat, lng, p.latitude, p.longitude)
          if (d > 200) continue
          const s = similarity(v.name, p.name)
          if (!best || s > best.sim) best = { our: p, sim: s, dist: d }
        }
      }
    }

    if (best && best.sim >= 0.75 && best.dist <= 150) {
      toLink.push({ our: best.our, vv: v, sim: best.sim, dist: best.dist })
    } else {
      toImport.push(v)
    }
  }

  console.log(`\n=== MATCH RESULTS ===`)
  console.log(`Would LINK (already in our DB): ${toLink.length}`)
  console.log(`Would IMPORT (new to us):       ${toImport.length}`)

  // Sample outputs
  console.log('\nSample links (first 10):')
  for (const m of toLink.slice(0, 10)) {
    console.log(`  [sim=${m.sim.toFixed(2)} d=${m.dist.toFixed(0)}m] "${m.vv.name}" ↔ "${m.our.name}" (${m.our.city})`)
  }
  console.log('\nSample imports (first 10):')
  for (const v of toImport.slice(0, 10)) {
    console.log(`  [L${v.veg_level}] "${v.name}" | ${v.city ?? '?'}, ${v.__country ?? '?'} | ${v.home_page ?? '(no web)'}`)
  }

  // By country
  const byCountry: Record<string, number> = {}
  for (const v of toImport) byCountry[v.__country ?? 'Unknown'] = (byCountry[v.__country ?? 'Unknown'] ?? 0) + 1
  const top = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 20)
  console.log('\nImports by country (top 20):')
  for (const [c, n] of top) console.log(`  ${c.padEnd(30)} ${n}`)

  // Persist preview files
  writeFileSync('logs/vegguide-links-preview.jsonl',
    toLink.map(m => JSON.stringify({
      our_id: m.our.id, our_name: m.our.name, vv_id: m.vv.vendor_id, vv_name: m.vv.name,
      sim: m.sim, dist_m: m.dist,
    })).join('\n'))
  writeFileSync('logs/vegguide-imports-preview.jsonl',
    toImport.map(v => JSON.stringify({
      vv_id: v.vendor_id, name: v.name, city: v.city, country: v.__country,
      veg_level: v.veg_level, lat: v.latitude, lng: v.longitude, home_page: v.home_page,
    })).join('\n'))
  console.log('\nPreviews: logs/vegguide-links-preview.jsonl, logs/vegguide-imports-preview.jsonl')

  if (!commit) {
    console.log('\n(dry-run — rerun with --commit to persist)')
    return
  }

  // ----- COMMIT -----
  if (!importOnly) {
    console.log(`\nLinking ${toLink.length} places (writing vegguide_id)...`)
    let linked = 0
    for (const m of toLink) {
      const { error } = await supabase.from('places').update({
        vegguide_id: m.vv.vendor_id,
        vegguide_checked_at: new Date().toISOString(),
      }).eq('id', m.our.id)
      if (error) { console.error('link err', m.our.id, error.message); continue }
      linked++
      if (linked % 100 === 0) console.log(`  ${linked}/${toLink.length}`)
    }
    console.log(`  linked ${linked}`)
  }

  if (!linkOnly) {
    console.log(`\nImporting ${toImport.length} new places...`)
    const rows = toImport.map(v => {
      const addr = [v.address1, v.address2].filter(Boolean).join(', ') || v.city || v.__country || 'Unknown'
      const tags = ['vegguide-imported']
      if (Number(v.veg_level) === 5) tags.push('vegguide-l5-pure-vegan')
      if (Number(v.veg_level) === 4) tags.push('vegguide-l4-vegetarian')
      return {
        name: String(v.name).slice(0, 200),
        description: v.short_description || null,
        address: addr,
        city: normalizeCity(v.city, v.__country),
        country: v.__country,
        latitude: v.latitude,
        longitude: v.longitude,
        phone: v.phone || null,
        website: cleanWebsite(v.home_page),
        vegan_level: 'vegan_friendly' as const,
        source: SOURCE_TAG,
        source_id: String(v.vendor_id),
        vegguide_id: v.vendor_id,
        vegguide_checked_at: new Date().toISOString(),
        category: /\b(store|shop|grocery|market|bakery|deli)\b/i.test(v.name) ? 'store' : 'eat',
        tags,
        is_verified: false,
        created_by: ADMIN_USER_ID,
      }
    })

    const BATCH = 100
    let imported = 0, failed = 0
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH)
      const { error, data } = await supabase.from('places').insert(chunk).select('id')
      if (error) {
        failed += chunk.length
        if (failed <= 500) console.error(`batch err at ${i}: ${error.message}`)
      } else {
        imported += (data?.length ?? chunk.length)
      }
      if ((i + BATCH) % 500 === 0 || i + BATCH >= rows.length) {
        console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length} (imported=${imported} failed=${failed})`)
      }
    }
    console.log(`  imported ${imported}, failed ${failed}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
