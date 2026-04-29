/**
 * Aggressive image-acquisition pass for the 8 Michelin places still without
 * a photo. Strategies tried in order:
 *   1. Fetch homepage as googlebot UA (some sites gate on bot/human)
 *   2. Scrape every <img src> from homepage, filter for non-logo, size-rank,
 *      return the biggest that looks like a content image
 *   3. Also fetch common gallery paths (/menu, /gallery, /images, /press,
 *      /about) and repeat the <img> scan
 *   4. If the place has a /wp-content/ pattern, try enumerating one directory
 *      up (common restaurant WP themes put press shots there)
 * If still nothing: caller can try chrome-devtools screenshot as final fallback.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import sharp from 'sharp'
config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const GBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

interface Target { slug: string; website: string | null }

const TARGETS: Target[] = [
  { slug: 'plates-london', website: 'https://plates-london.com' },
  { slug: 'bonvivant-cocktail-bistro-berlin', website: 'https://bonvivant.berlin' },
  { slug: 'millennium-oakland', website: 'https://www.millenniumrestaurant.com' },
  { slug: 'soda-club-new-york-1', website: 'https://www.sodaclubnyc.com' },
  { slug: 'bistro-lupa-copenhagen', website: 'https://www.bistrolupa.dk' },
  { slug: 'alt-a-seoul-1', website: null },
  { slug: 'loveurth-busan', website: null },
  { slug: 'arp-busan', website: null },
]

async function tryFetch(url: string, ua: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': ua, Accept: 'text/html,image/*,*/*' },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    return await res.text()
  } catch { return null }
}

function extractImgs(html: string, baseUrl: string): string[] {
  const urls = new Set<string>()

  // <img src="..."> and <img data-src="...">
  const imgRegex = /<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["'][^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = imgRegex.exec(html)) !== null) {
    try {
      const abs = new URL(m[1], baseUrl).toString()
      urls.add(abs)
    } catch {}
  }

  // srcset attributes: "url 1x, url2 2x" -> extract each
  const srcsetRegex = /srcset=["']([^"']+)["']/gi
  while ((m = srcsetRegex.exec(html)) !== null) {
    for (const token of m[1].split(',')) {
      const u = token.trim().split(/\s+/)[0]
      if (u) try { urls.add(new URL(u, baseUrl).toString()) } catch {}
    }
  }

  // <source srcset="..."> inside <picture>
  const sourceRegex = /<source[^>]+srcset=["']([^"']+)["']/gi
  while ((m = sourceRegex.exec(html)) !== null) {
    for (const token of m[1].split(',')) {
      const u = token.trim().split(/\s+/)[0]
      if (u) try { urls.add(new URL(u, baseUrl).toString()) } catch {}
    }
  }

  // og:image again as safety net
  const ogRegex = /<meta[^>]+property=["']og:image[^"']*["'][^>]+content=["']([^"']+)["']/gi
  while ((m = ogRegex.exec(html)) !== null) {
    try { urls.add(new URL(m[1], baseUrl).toString()) } catch {}
  }

  return Array.from(urls).filter((u) =>
    /\.(jpe?g|png|webp|avif)(\?|$)/i.test(u) ||
    /\/(wp-content|uploads|images|media)\//i.test(u)
  ).filter((u) => !/logo|favicon|sprite|icon|placeholder|avatar/i.test(u))
}

async function measureImage(url: string): Promise<{ bytes: number; width: number; height: number } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': DESKTOP_UA, Accept: 'image/*' },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 10_000 || buf.length > 15_000_000) return null
    // Parse dimensions
    const meta = await sharp(buf).metadata()
    if (!meta.width || !meta.height) return null
    // Skip very small images (likely icons) or extreme aspect ratios
    if (meta.width < 400 || meta.height < 300) return null
    if (meta.width / meta.height > 6 || meta.height / meta.width > 3) return null
    return { bytes: buf.length, width: meta.width, height: meta.height }
  } catch { return null }
}

async function findBestImage(website: string): Promise<{ url: string; bytes: number } | null> {
  const paths = ['', '/menu', '/gallery', '/images', '/press', '/about', '/food', '/restaurant']
  const uas = [GBOT_UA, DESKTOP_UA, MOBILE_UA]

  const candidateSet = new Set<string>()
  for (const p of paths) {
    let pageUrl: string
    try { pageUrl = new URL(p, website).toString() } catch { continue }
    for (const ua of uas) {
      const html = await tryFetch(pageUrl, ua)
      if (!html) continue
      extractImgs(html, pageUrl).forEach(u => candidateSet.add(u))
      if (candidateSet.size > 0) break // first UA that returns HTML is enough per path
    }
  }

  console.log(`    ${candidateSet.size} candidate images found across pages`)
  // Measure up to 20 candidates, return the biggest by pixel area (filtered)
  const candidates = Array.from(candidateSet).slice(0, 25)
  const measured: Array<{ url: string; bytes: number; width: number; height: number }> = []
  for (const u of candidates) {
    const m = await measureImage(u)
    if (m) measured.push({ url: u, ...m })
  }
  measured.sort((a, b) => (b.width * b.height) - (a.width * a.height))
  return measured[0] || null
}

async function downloadAndStore(placeId: string, imgUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imgUrl, {
      headers: { 'User-Agent': DESKTOP_UA, Accept: 'image/*' },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const normalized = await sharp(buf).rotate().resize({
      width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true,
    }).jpeg({ quality: 88 }).toBuffer()
    const key = `${placeId}.jpg`
    const { error } = await sb.storage.from('place-images').upload(key, normalized, {
      contentType: 'image/jpeg', upsert: true,
      cacheControl: 'public, max-age=31536000, immutable',
    })
    if (error) { console.error(`    upload fail: ${error.message}`); return null }
    return sb.storage.from('place-images').getPublicUrl(key).data.publicUrl
  } catch { return null }
}

async function main() {
  const stillMissing: string[] = []
  for (const t of TARGETS) {
    console.log(`\n→ ${t.slug}`)
    if (!t.website) { console.log('  no website'); stillMissing.push(t.slug); continue }
    const best = await findBestImage(t.website)
    if (!best) { console.log('  no usable image'); stillMissing.push(t.slug); continue }
    console.log(`  best: ${best.url.slice(0, 100)} (${best.bytes} bytes)`)
    const { data: row } = await sb.from('places').select('id').eq('slug', t.slug).maybeSingle()
    if (!row) continue
    const stored = await downloadAndStore((row as any).id, best.url)
    if (stored) {
      await sb.from('places').update({ main_image_url: stored }).eq('id', (row as any).id)
      console.log(`  ✓ stored`)
    } else {
      stillMissing.push(t.slug)
    }
  }
  console.log(`\n${TARGETS.length - stillMissing.length}/${TARGETS.length} now have images. Still missing: ${stillMissing.join(', ')}`)
}

main().catch(e => { console.error(e); process.exit(1) })
