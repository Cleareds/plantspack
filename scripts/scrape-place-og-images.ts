/**
 * For every place that has a website but no main_image_url, fetch the site
 * and extract the Open Graph image. Download, upload to Supabase
 * `place-images` bucket, then set main_image_url to the uploaded URL.
 *
 * Rationale: we just nulled out ~1,600 broken main images. The long-tail of
 * "no image at all" is ~17K places, of which ~8K have a website we can
 * scrape. Even a 30% success rate adds ~2,500 place images — a huge boost
 * to both UX and SEO (each place page becomes rich-result eligible for
 * images).
 *
 * We download and re-host because directly linking to the site's OG image
 * would recreate the broken-link problem when the origin's CDN expires the
 * URL.
 *
 * USAGE:
 *   tsx scripts/scrape-place-og-images.ts --dry-run
 *   tsx scripts/scrape-place-og-images.ts --commit
 *   tsx scripts/scrape-place-og-images.ts --commit --limit 100
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const DRY_RUN = !process.argv.includes('--commit')
const LIMIT_IDX = process.argv.indexOf('--limit')
const LIMIT = LIMIT_IDX >= 0 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : Infinity
const CONCURRENCY = 8
const FETCH_TIMEOUT_MS = 10000
const BUCKET = 'place-images'
const UA = 'Mozilla/5.0 (compatible; PlantsPackBot/1.0; +https://plantspack.com)'

// Hosts whose "website" field points at a social profile rather than a real
// site. Their OG images are signed / auth-protected / useless, or in the case
// of aggregators (happycow) aren't the place's own imagery. Skip entirely.
const SKIP_HOST = /(facebook\.com|instagram\.com|happycow\.net|x\.com|twitter\.com|tiktok\.com|linkedin\.com|yelp\.com|tripadvisor\.|google\.com)/i

// Instagram / Facebook CDN image URLs are signed + auth-required; fetching
// them succeeds once then fails. Skip.
const SKIP_IMAGE_CDN = /(cdninstagram\.com|fbcdn\.net|lookaside\.fbsbx\.com|scontent[.-])/i

function normalizeUrl(raw: string): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  return `https://${trimmed}`
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function isLikelyImageUrl(candidate: string): boolean {
  // Basic sanity: starts with a URL scheme or path, no whitespace, no HTML.
  if (!/^(?:https?:\/\/|\/)/i.test(candidate)) return false
  if (/[\s<>"']/.test(candidate)) return false
  // The common Facebook-page breakage produces og:image with a TITLE value
  // like "Bárka | Černošice" — reject any value containing a pipe that's
  // clearly prose.
  if (/\|[a-zA-Z]/.test(candidate) && !candidate.match(/\.(jpg|jpeg|png|webp|avif|gif)(\?|$)/i)) return false
  return true
}

function extractOgImage(html: string, baseUrl: string): string | null {
  // Try og:image, twitter:image, link rel=image_src, apple-touch-icon, in
  // decreasing order of likely quality.
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
    // Apple-touch-icon is usually 180×180+ — good enough fallback for sites
    // that don't bother with OG tags.
    /<link[^>]+rel=["']apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m && m[1]) {
      const decoded = decodeHtmlEntities(m[1])
      if (!isLikelyImageUrl(decoded)) continue
      try {
        const absolute = new URL(decoded, baseUrl).toString()
        if (SKIP_IMAGE_CDN.test(absolute)) continue
        return absolute
      } catch {
        continue
      }
    }
  }
  return null
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('text/html')) return null
    // Cap at 500 KB — OG tags are in <head>, no need to slurp whole page.
    const reader = res.body?.getReader()
    if (!reader) return null
    const chunks: Uint8Array[] = []
    let total = 0
    while (total < 500_000) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      total += value.byteLength
    }
    reader.cancel().catch(() => {})
    return Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf8')
  } catch {
    return null
  }
}

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    // Min 3KB (skip tiny logos/favicons), max 10MB (weird edge cases).
    if (buf.length < 3000 || buf.length > 10_000_000) return null
    return buf
  } catch {
    return null
  }
}

async function processInPool<T>(items: T[], handler: (item: T) => Promise<void>) {
  let i = 0
  async function worker() {
    while (i < items.length) {
      const myIdx = i++
      await handler(items[myIdx])
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : '*** LIVE (writing to DB + storage) ***'}`)
  if (LIMIT !== Infinity) console.log(`Limit: first ${LIMIT} rows`)

  const { data, error } = await sb
    .from('places')
    .select('id, slug, name, website')
    .is('archived_at', null)
    .is('main_image_url', null)
    .not('website', 'is', null)

  if (error) {
    console.error('Query failed:', error)
    process.exit(1)
  }
  const candidates = (data || []).slice(0, LIMIT)
  console.log(`Candidates: ${candidates.length}`)

  let htmlOk = 0
  let ogFound = 0
  let uploaded = 0
  let failed = 0
  const startedAt = Date.now()
  let lastLogAt = Date.now()
  let processed = 0

  await processInPool(candidates, async (p) => {
    processed++
    const siteUrl = normalizeUrl(p.website)
    if (!siteUrl) {
      failed++
      return
    }
    if (SKIP_HOST.test(siteUrl)) {
      // Social-profile websites — no useful OG image we can rehost.
      failed++
      return
    }

    const html = await fetchHtml(siteUrl)
    if (!html) {
      failed++
      return
    }
    htmlOk++

    const ogUrl = extractOgImage(html, siteUrl)
    if (!ogUrl) {
      failed++
      return
    }
    ogFound++

    const buf = await fetchImage(ogUrl)
    if (!buf) {
      failed++
      return
    }

    // Infer extension from URL or default jpg.
    let ext = 'jpg'
    const lower = ogUrl.toLowerCase().split('?')[0]
    for (const e of ['png', 'webp', 'avif', 'gif']) {
      if (lower.endsWith(`.${e}`)) { ext = e; break }
    }

    const key = `${p.id}.${ext}`

    if (!DRY_RUN) {
      const { error: upErr } = await sb.storage.from(BUCKET).upload(key, buf, {
        contentType: `image/${ext}`,
        upsert: true,
        cacheControl: 'public, max-age=31536000, immutable',
      })
      if (upErr) {
        console.error(`  ${p.slug}: upload failed: ${upErr.message}`)
        failed++
        return
      }

      const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(key)
      const { error: updateErr } = await sb.from('places').update({
        main_image_url: urlData.publicUrl,
      }).eq('id', p.id)
      if (updateErr) {
        console.error(`  ${p.slug}: db update failed: ${updateErr.message}`)
        failed++
        return
      }
    }
    uploaded++

    if (Date.now() - lastLogAt > 5000) {
      const rate = (processed / ((Date.now() - startedAt) / 1000)).toFixed(1)
      console.log(`  ${processed}/${candidates.length} (${rate}/s) — html=${htmlOk} og=${ogFound} saved=${uploaded} failed=${failed}`)
      lastLogAt = Date.now()
    }
  })

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`\nDone in ${elapsed}s.`)
  console.log(`  Candidates processed: ${processed}`)
  console.log(`  HTML fetched OK: ${htmlOk}`)
  console.log(`  OG image found: ${ogFound}`)
  console.log(`  ${DRY_RUN ? 'Would upload' : 'Uploaded'} + set main_image_url: ${uploaded}`)
  console.log(`  Failed: ${failed}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
