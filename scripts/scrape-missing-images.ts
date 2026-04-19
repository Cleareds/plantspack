#!/usr/bin/env tsx
/**
 * Fill missing `main_image_url` on places by scraping their website.
 *
 * Targets:
 *   - places with a website AND no main_image_url
 *   - places tagged `image-unreachable` (refresh from website)
 *
 * Signals we look for (in order):
 *   1. <meta property="og:image">           (most reliable — 70-80% of sites)
 *   2. <meta name="twitter:image">          (fallback)
 *   3. Schema.org LocalBusiness `image`     (parsed from ld+json)
 *   4. First <img> with width/height ≥ 400  (fallback, rarely used)
 *
 * A scraped URL is validated with a HEAD request (content-type image/*) before
 * we write it to the DB — so we never overwrite a null image with another
 * broken URL.
 *
 * Stores external URL as-is (cheapest). If the source goes down, the daily
 * audit-osm-quality.ts run will re-tag it `image-unreachable` and this script
 * picks it up on the next pass.
 *
 * Usage:
 *   tsx scripts/scrape-missing-images.ts                     # dry-run
 *   tsx scripts/scrape-missing-images.ts --commit            # persist
 *   tsx scripts/scrape-missing-images.ts --commit --limit=500
 *   tsx scripts/scrape-missing-images.ts --commit --only-flagged
 *   tsx scripts/scrape-missing-images.ts --commit --concurrency=25
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { writeFileSync, appendFileSync } from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const args = process.argv.slice(2)
const commit = args.includes('--commit')
const onlyFlagged = args.includes('--only-flagged')
const limit = Number(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 0)
const concurrency = Number(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? 25)
const REPORT_FILE = 'logs/image-scrape.jsonl'
const UA = 'PlantsPack-ImageScrape/1.0 (+https://plantspack.com)'

interface Place {
  id: string
  name: string
  website: string | null
  main_image_url: string | null
  tags: string[] | null
}

// ---- Extractors (reuse patterns from src/lib/places/website-verify.ts) ----
const ogImageRe = /<meta\s+(?:property|name)=["']og:image(?::secure_url)?["']\s+content=["']([^"']+)["']/i
const twitterImageRe = /<meta\s+(?:property|name)=["']twitter:image(?::src)?["']\s+content=["']([^"']+)["']/i
const ldJsonRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
const imgTagRe = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*(?:width=["']?(\d+)["']?)?[^>]*(?:height=["']?(\d+)["']?)?/gi

function absoluteUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).href
  } catch { return null }
}

function extractOgImage(html: string): string | null {
  const m = html.match(ogImageRe)
  return m ? m[1] : null
}

function extractTwitterImage(html: string): string | null {
  const m = html.match(twitterImageRe)
  return m ? m[1] : null
}

function extractLdImage(html: string): string | null {
  let m: RegExpExecArray | null
  ldJsonRe.lastIndex = 0
  while ((m = ldJsonRe.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim())
      const find = (node: any): string | null => {
        if (!node) return null
        if (Array.isArray(node)) { for (const n of node) { const r = find(n); if (r) return r } return null }
        if (typeof node !== 'object') return null
        if (node.image) {
          if (typeof node.image === 'string') return node.image
          if (Array.isArray(node.image) && node.image[0]) {
            return typeof node.image[0] === 'string' ? node.image[0] : (node.image[0].url ?? null)
          }
          if (typeof node.image === 'object' && node.image.url) return node.image.url
        }
        if (node['@graph']) return find(node['@graph'])
        return null
      }
      const hit = find(parsed)
      if (hit) return hit
    } catch { /* skip */ }
  }
  return null
}

function extractFirstLargeImg(html: string, baseUrl: string): string | null {
  let m: RegExpExecArray | null
  imgTagRe.lastIndex = 0
  while ((m = imgTagRe.exec(html)) !== null) {
    const src = m[1]
    if (!src) continue
    // Reject tracking pixels, icons, and clearly small thumbnails.
    if (/\.(gif|svg)(\?|$)/i.test(src)) continue
    if (/pixel|spacer|1x1|tracking|\/tr\?id=|fbq|analytics/i.test(src)) continue
    // Reject logos / branding / nav elements — these show as "images" but are
    // not useful as the place photo.
    if (/logo|favicon|icon(\d|\.|-|_)|_icon_|header|nav|sprite|badge|seal|certificate/i.test(src)) continue
    // Reject thumbnailed CDN URLs (wix, shopify, cloudinary) forced to tiny widths.
    if (/[/_](fit|w|width)[_/]?[\-_]?(25|50|75|100|150)\b/i.test(src)) continue
    const w = Number(m[2] ?? 0), h = Number(m[3] ?? 0)
    if ((w && w < 300) || (h && h < 200)) continue
    const abs = absoluteUrl(src, baseUrl)
    if (abs) return abs
  }
  return null
}

async function fetchHtml(url: string, timeoutMs = 8000): Promise<{ ok: boolean; body: string; finalUrl: string; reason?: string }> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
    })
    clearTimeout(t)
    if (!res.ok) return { ok: false, body: '', finalUrl: res.url, reason: `http_${res.status}` }
    const body = (await res.text()).slice(0, 256 * 1024)
    return { ok: true, body, finalUrl: res.url || url }
  } catch (e: any) {
    return { ok: false, body: '', finalUrl: url, reason: e?.name === 'AbortError' ? 'timeout' : 'network' }
  }
}

async function headImage(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': UA },
    })
    clearTimeout(t)
    if (!res.ok && res.status !== 405 && res.status !== 403) return false
    const ct = res.headers.get('content-type') ?? ''
    // Some CDNs return no content-type on HEAD. Accept if URL ends with an image extension.
    if (!ct && /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url)) return true
    return /^image\//i.test(ct)
  } catch {
    return false
  }
}

function normalizeUrl(url: string): string | null {
  if (!url) return null
  let u = url.trim()
  if (!u) return null
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  try { return new URL(u).href } catch { return null }
}

// Reject URLs that point at obviously-too-small resized images.
function isLikelyThumbnail(url: string): boolean {
  return /[/_](fit|w|width)[_/]?[\-_]?(25|50|75|100|150)\b/i.test(url) ||
         /[?&](w|width)=(25|50|75|100|150)\b/i.test(url)
}

async function scrapeImage(place: Place): Promise<{ url: string | null; source: string | null; reason: string | null }> {
  const website = normalizeUrl(place.website!)
  if (!website) return { url: null, source: null, reason: 'bad_url' }
  const { ok, body, finalUrl, reason } = await fetchHtml(website)
  if (!ok) return { url: null, source: null, reason: reason ?? 'fetch_fail' }

  const candidates: Array<{ url: string; source: string }> = []
  const og = extractOgImage(body); if (og && !isLikelyThumbnail(og)) candidates.push({ url: og, source: 'og:image' })
  const tw = extractTwitterImage(body); if (tw && !isLikelyThumbnail(tw)) candidates.push({ url: tw, source: 'twitter:image' })
  const ld = extractLdImage(body); if (ld && !isLikelyThumbnail(ld)) candidates.push({ url: ld, source: 'ld+json' })
  const first = extractFirstLargeImg(body, finalUrl); if (first) candidates.push({ url: first, source: 'first_img' })

  for (const c of candidates) {
    const abs = absoluteUrl(c.url, finalUrl)
    if (!abs) continue
    const alive = await headImage(abs)
    if (alive) return { url: abs, source: c.source, reason: null }
  }
  return { url: null, source: null, reason: candidates.length ? 'image_urls_dead' : 'no_image_meta' }
}

// ---- Main ----
async function loadBatch(batchSize: number): Promise<Place[]> {
  let q = supabase
    .from('places')
    .select('id, name, website, main_image_url, tags')
    .is('archived_at', null)
    .not('website', 'is', null)
    // Exclude rows we've already processed in this run. Without this, the
    // streaming loop re-fetches the same null-image rows every batch and
    // spins forever.
    .not('tags', 'cs', '{image-scraped}')
    .not('tags', 'cs', '{image-scrape-miss}')

  if (onlyFlagged) {
    q = q.contains('tags', ['image-unreachable'])
  } else {
    q = q.is('main_image_url', null)
  }
  q = q.limit(batchSize)
  const { data, error } = await q
  if (error) throw error
  return (data as Place[]) ?? []
}

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'} · concurrency=${concurrency}${onlyFlagged ? ' · only-flagged' : ''}${limit ? ` · hard limit ${limit}` : ''}`)
  writeFileSync(REPORT_FILE, '')

  const stats = {
    processed: 0,
    with_image: 0,
    no_image: 0,
    by_source: { 'og:image': 0, 'twitter:image': 0, 'ld+json': 0, 'first_img': 0 } as Record<string, number>,
    failure_reasons: {} as Record<string, number>,
  }
  const HARD_CAP = limit > 0 ? limit : Infinity
  const BATCH = 300
  const startTs = Date.now()

  while (stats.processed < HARD_CAP) {
    const take = Math.min(BATCH, HARD_CAP - stats.processed)
    let places: Place[]
    try {
      places = await loadBatch(take)
    } catch (e: any) {
      console.error(`load err: ${e.message} — retrying in 10s`)
      await new Promise(r => setTimeout(r, 10000))
      continue
    }
    if (places.length === 0) break

    let idx = 0
    async function worker() {
      while (true) {
        const i = idx++
        if (i >= places.length) return
        const p = places[i]
        try {
          const { url, source, reason } = await scrapeImage(p)
          if (url) {
            stats.with_image++
            stats.by_source[source!] = (stats.by_source[source!] ?? 0) + 1
            appendFileSync(REPORT_FILE, JSON.stringify({ id: p.id, name: p.name, website: p.website, url, source }) + '\n')
            if (commit) {
              // Also drop the image-unreachable tag if present.
              const cleanTags = (p.tags || []).filter(t => t !== 'image-unreachable')
              const { error } = await supabase.from('places').update({
                main_image_url: url,
                tags: cleanTags.concat('image-scraped'),
              }).eq('id', p.id)
              if (error) console.error(`  update err ${p.id}: ${error.message}`)
            }
          } else {
            stats.no_image++
            stats.failure_reasons[reason ?? 'unknown'] = (stats.failure_reasons[reason ?? 'unknown'] ?? 0) + 1
            if (commit && p.tags) {
              // Mark so we don't keep re-fetching sites we already know have no image.
              const hasTag = p.tags.includes('image-scrape-miss')
              if (!hasTag) {
                await supabase.from('places').update({
                  tags: [...p.tags, 'image-scrape-miss'],
                }).eq('id', p.id)
              }
            }
          }
        } catch (e: any) {
          stats.no_image++
          stats.failure_reasons['exception'] = (stats.failure_reasons['exception'] ?? 0) + 1
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()))

    stats.processed += places.length
    const elapsed = (Date.now() - startTs) / 1000
    const rate = stats.processed / elapsed
    console.log(`  processed=${stats.processed}  rate=${rate.toFixed(1)}/s  with_image=${stats.with_image} (${((stats.with_image / stats.processed) * 100).toFixed(1)}%)  no_image=${stats.no_image}`)

    // If not committing, loadBatch keeps returning the same rows — stop after first pass.
    if (!commit) break
  }

  console.log('\n=== IMAGE-SCRAPE RESULT ===')
  console.log(stats)
  console.log(`\nReport: ${REPORT_FILE}`)
  if (!commit) console.log('\n(dry-run — rerun with --commit to persist)')
}

main().catch(e => { console.error(e); process.exit(1) })
