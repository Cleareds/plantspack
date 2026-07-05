/**
 * Shared hero-image helpers for CLI scripts.
 *
 * `scrapeHeroImage` — extracted verbatim from scripts/add-place.ts so the
 * submission-approval flow (scripts/enrich-place-image.ts) can reuse the same
 * multi-pass, size-ranked scraper.
 *
 * `rehostImage` — download + normalise (sharp) + upload to the Supabase
 * `place-images` bucket as `{place_id}.jpg`, mirroring
 * scripts/attach-place-image.ts. Returns the public URL.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

/** Social platforms never yield a usable hero image to a plain fetch — they
 *  serve their own brand asset (IG logo) or a login wall. Scraping them once
 *  shipped the Instagram logo as a restaurant photo; hard-refuse instead. */
const SOCIAL_HOSTS = /(^|\.)(instagram\.com|facebook\.com|fb\.com|twitter\.com|x\.com|tiktok\.com|linktr\.ee)$/i

export function isSocialUrl(url: string): boolean {
  try { return SOCIAL_HOSTS.test(new URL(url).hostname) } catch { return false }
}

export async function scrapeHeroImage(url: string): Promise<string | null> {
  if (isSocialUrl(url)) return null
  try {
  // Multi-pass: try the homepage + common hero/gallery paths with multiple
  // user agents (some sites gate on Googlebot, others on real browsers).
  // Collect every plausible candidate, then size-rank by fetching headers
  // and returning the biggest non-logo raster image.
  const UAS = [
    DESKTOP_UA,
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  ]
  const PATHS = ['', '/menu', '/menus', '/gallery', '/about', '/about-us', '/food', '/press', '/location']
  const SKIP = /logo|favicon|sprite|icon|avatar|emoji|placeholder|\.svg(\?|$)/i

  const candidates = new Set<string>()
  for (const p of PATHS) {
    let pageUrl: string
    try { pageUrl = new URL(p, url).toString() } catch { continue }
    for (const ua of UAS) {
      try {
        const res = await fetch(pageUrl, {
          headers: { 'User-Agent': ua, 'Accept': 'text/html' },
          signal: AbortSignal.timeout(12000),
          redirect: 'follow',
        })
        if (!res.ok) continue
        const ct = res.headers.get('content-type') || ''
        if (!ct.includes('html')) continue
        const html = await res.text()

        // og:image — but only if content is non-empty (Baladi's "" case).
        const og = html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i)
        if (og?.[1]?.trim()) { try { candidates.add(new URL(og[1], pageUrl).toString()) } catch {} }
        const ogRev = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
        if (ogRev?.[1]?.trim()) { try { candidates.add(new URL(ogRev[1], pageUrl).toString()) } catch {} }
        const tw = html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i)
        if (tw?.[1]?.trim()) { try { candidates.add(new URL(tw[1], pageUrl).toString()) } catch {} }

        // <img>, data-src, data-original, data-lazy-src, and srcset attrs.
        const imgRe = /<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']/gi
        let m: RegExpExecArray | null
        while ((m = imgRe.exec(html)) !== null) {
          try {
            const abs = new URL(m[1], pageUrl).toString()
            if (!SKIP.test(abs)) candidates.add(abs)
          } catch {}
        }
        const srcsetRe = /srcset=["']([^"']+)["']/gi
        while ((m = srcsetRe.exec(html)) !== null) {
          for (const tok of m[1].split(',')) {
            const u = tok.trim().split(/\s+/)[0]
            if (!u) continue
            try {
              const abs = new URL(u, pageUrl).toString()
              if (!SKIP.test(abs)) candidates.add(abs)
            } catch {}
          }
        }
        break // first UA that returned HTML is enough per path
      } catch { /* fall through to next UA */ }
    }
  }

  if (candidates.size === 0) return null

  // Size-rank top 30 candidates. Fetch headers + first bytes, parse
  // dimensions via Node's sharp (already a project dep). Pick the biggest
  // non-logo raster. Skips anything < 600px wide or extreme aspect ratios.
  const list = Array.from(candidates).slice(0, 30)
  const measured: { u: string; area: number }[] = []
  for (const u of list) {
    try {
      const r = await fetch(u, {
        headers: { 'User-Agent': UAS[0], 'Accept': 'image/*' },
        signal: AbortSignal.timeout(10000),
      })
      if (!r.ok) continue
      const ct = r.headers.get('content-type') || ''
      if (!ct.startsWith('image/')) continue
      const buf = Buffer.from(await r.arrayBuffer())
      if (buf.length < 5000) continue
      // sharp is a transitive dep; require() at runtime to avoid hard-linking
      // it into the CLI if it's ever pruned. No-op fallback: skip measurement.
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const sharp = require('sharp')
        const meta = await sharp(buf).metadata()
        if (!meta.width || !meta.height) continue
        if (meta.width < 600 || meta.height < 300) continue
        if (meta.width / meta.height > 6 || meta.height / meta.width > 3) continue
        measured.push({ u, area: meta.width * meta.height })
      } catch {
        // Can't measure without sharp — fall back to bytes as a rough proxy.
        measured.push({ u, area: buf.length })
      }
    } catch { /* unreachable / bad url, skip */ }
  }
  if (measured.length === 0) return null
  measured.sort((a, b) => b.area - a.area)
  return measured[0].u
  } catch { return null }
}

export async function rehostImage(
  sb: SupabaseClient,
  placeId: string,
  imageUrl: string,
): Promise<{ publicUrl: string } | { error: string }> {
  const res = await fetch(imageUrl, {
    headers: { 'User-Agent': DESKTOP_UA, Accept: 'image/*' },
    signal: AbortSignal.timeout(20000),
    redirect: 'follow',
  })
  if (!res.ok) return { error: `download failed: ${res.status}` }
  const ct = res.headers.get('content-type') || ''
  if (!ct.startsWith('image/')) return { error: `not an image (content-type=${ct})` }
  const raw = Buffer.from(await res.arrayBuffer())

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require('sharp')
  const normalized = await sharp(raw).rotate().resize({
    width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true,
  }).jpeg({ quality: 88 }).toBuffer()

  const key = `${placeId}.jpg`
  const { error: upErr } = await sb.storage.from('place-images').upload(key, normalized, {
    contentType: 'image/jpeg',
    upsert: true,
    cacheControl: 'public, max-age=31536000, immutable',
  })
  if (upErr) return { error: `upload fail: ${upErr.message}` }
  return { publicUrl: sb.storage.from('place-images').getPublicUrl(key).data.publicUrl }
}
