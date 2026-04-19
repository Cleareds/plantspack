#!/usr/bin/env tsx
/**
 * Broad data-quality audit for already-imported places.
 *
 * For every non-archived place, check:
 *   1. main_image_url reachable  (HEAD request)
 *   2. First few entries of images[] reachable
 *   3. Address looks real (not 'Unknown', not city-only, ≥ 8 chars)
 *   4. At least one of website / phone (completeness signal)
 *   5. Verification freshness (updated_at older than 180 days)
 *
 * Writes admin-review tags onto the row:
 *   - 'image-unreachable'      — main or any listed image 404/timeout
 *   - 'address-placeholder'    — "Unknown" / empty / just country
 *   - 'data-incomplete'        — no website AND no phone
 *   - 'stale-verification'     — updated_at > 180d ago
 *
 * Also writes a full per-row report to logs/osm-audit.jsonl.
 *
 * Usage:
 *   tsx scripts/audit-osm-quality.ts                  # dry-run report
 *   tsx scripts/audit-osm-quality.ts --commit          # tag places
 *   tsx scripts/audit-osm-quality.ts --limit=500       # small sample
 *   tsx scripts/audit-osm-quality.ts --skip-images     # skip network-heavy part
 *   tsx scripts/audit-osm-quality.ts --concurrency=30
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { appendFileSync, writeFileSync } from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const args = process.argv.slice(2)
const commit = args.includes('--commit')
const skipImages = args.includes('--skip-images')
const limit = Number(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 0)
const concurrency = Number(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? 20)

const REPORT_FILE = 'logs/osm-audit.jsonl'
const STALE_DAYS = 180

interface Place {
  id: string
  name: string
  slug: string | null
  city: string | null
  country: string | null
  address: string | null
  website: string | null
  phone: string | null
  main_image_url: string | null
  images: string[] | null
  source: string | null
  tags: string[] | null
  updated_at: string
}

async function headCheck(url: string, timeoutMs = 5000): Promise<{ ok: boolean; status: number | null; reason: string | null }> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url, {
      method: 'HEAD',
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'PlantsPack-ImageAudit/1.0' },
    })
    clearTimeout(t)
    // Some CDNs reject HEAD with 405 but serve the image; treat 200/206/300s/403/405 as alive.
    const ok = res.ok || res.status === 403 || res.status === 405
    return { ok, status: res.status, reason: ok ? null : 'http_error' }
  } catch (e: any) {
    return { ok: false, status: null, reason: e?.name === 'AbortError' ? 'timeout' : 'network' }
  }
}

function isPlaceholderAddress(addr: string | null, city: string | null, country: string | null): boolean {
  if (!addr) return true
  const a = addr.trim()
  if (!a) return true
  if (a.length < 8) return true
  if (/^unknown$/i.test(a)) return true
  // Just a country name or just city + country
  if (country && a.toLowerCase() === country.toLowerCase()) return true
  if (city && country && a.toLowerCase() === `${city}, ${country}`.toLowerCase()) return true
  return false
}

function isStale(updatedAt: string): boolean {
  const age = Date.now() - new Date(updatedAt).getTime()
  return age > STALE_DAYS * 24 * 60 * 60 * 1000
}

async function loadPlaces(lim: number): Promise<Place[]> {
  const PAGE = 1000
  const out: Place[] = []
  let off = 0
  const cap = lim > 0 ? lim : Infinity
  while (out.length < cap) {
    const take = Math.min(PAGE, cap - out.length)
    const { data, error } = await supabase
      .from('places')
      .select('id, name, slug, city, country, address, website, phone, main_image_url, images, source, tags, updated_at')
      .is('archived_at', null)
      .order('id', { ascending: true })
      .range(off, off + take - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    out.push(...(data as Place[]))
    off += data.length
    if (data.length < take) break
  }
  return out
}

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT (tags will be written)' : 'DRY-RUN'} · concurrency=${concurrency}${skipImages ? ' · skipping image checks' : ''}`)

  const places = await loadPlaces(limit)
  console.log(`Loaded ${places.length} places\n`)
  if (places.length === 0) { console.log('Nothing to audit.'); return }

  writeFileSync(REPORT_FILE, '')  // truncate

  const stats = {
    checked: 0,
    image_unreachable: 0,
    address_placeholder: 0,
    data_incomplete: 0,
    stale_verification: 0,
    all_good: 0,
  }
  const startTs = Date.now()
  let idx = 0

  async function worker() {
    while (true) {
      const i = idx++
      if (i >= places.length) return
      const p = places[i]
      const tagsToAdd: string[] = []
      const report: any = { id: p.id, name: p.name, city: p.city, country: p.country, source: p.source }

      // 1. Image check
      if (!skipImages) {
        const toCheck: string[] = []
        if (p.main_image_url) toCheck.push(p.main_image_url)
        const extras = Array.isArray(p.images) ? p.images.filter(u => u && u !== p.main_image_url).slice(0, 2) : []
        toCheck.push(...extras)
        let anyBroken = false
        const results: Array<{ url: string; ok: boolean; status: number | null; reason: string | null }> = []
        for (const url of toCheck) {
          const r = await headCheck(url)
          results.push({ url, ...r })
          if (!r.ok) anyBroken = true
        }
        if (anyBroken) {
          tagsToAdd.push('image-unreachable')
          stats.image_unreachable++
          report.broken_images = results.filter(r => !r.ok)
        }
      }

      // 2. Address completeness
      if (isPlaceholderAddress(p.address, p.city, p.country)) {
        tagsToAdd.push('address-placeholder')
        stats.address_placeholder++
        report.address = p.address
      }

      // 3. Data completeness
      if (!p.website && !p.phone) {
        tagsToAdd.push('data-incomplete')
        stats.data_incomplete++
      }

      // 4. Stale verification
      if (isStale(p.updated_at)) {
        tagsToAdd.push('stale-verification')
        stats.stale_verification++
      }

      stats.checked++
      if (tagsToAdd.length === 0) stats.all_good++

      if (tagsToAdd.length > 0) {
        report.added_tags = tagsToAdd
        appendFileSync(REPORT_FILE, JSON.stringify(report) + '\n')
        if (commit) {
          // Merge with existing tags, de-dupe.
          const existing: string[] = p.tags || []
          const merged = Array.from(new Set([...existing, ...tagsToAdd]))
          await supabase.from('places').update({ tags: merged }).eq('id', p.id)
        }
      }

      if ((i + 1) % 500 === 0) {
        const elapsed = (Date.now() - startTs) / 1000
        const rate = (i + 1) / elapsed
        const eta = (places.length - (i + 1)) / rate
        console.log(`  ${i + 1}/${places.length}  rate=${rate.toFixed(1)}/s  ETA=${Math.round(eta / 60)}min  broken_img=${stats.image_unreachable}  placeholder=${stats.address_placeholder}  incomplete=${stats.data_incomplete}  stale=${stats.stale_verification}`)
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  console.log('\n=== OSM AUDIT RESULT ===')
  console.log(stats)
  console.log(`Report: ${REPORT_FILE}`)
  if (!commit) console.log('\n(dry-run — rerun with --commit to tag places)')
}

main().catch(e => { console.error(e); process.exit(1) })
