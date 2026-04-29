/**
 * Scrape Michelin Guide pages for the 3 Korean places still without images.
 * Michelin hosts high-quality restaurant hero photos on their own pages.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import sharp from 'sharp'
config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

const TARGETS = [
  { slug: 'alt-a-seoul-1', michelinUrl: 'https://guide.michelin.com/us/en/seoul-capital-area/kr-seoul/restaurant/alt-a' },
  { slug: 'loveurth-busan', michelinUrl: 'https://guide.michelin.com/en/busan-region/busan_1025838/restaurant/loveurth' },
  { slug: 'arp-busan', michelinUrl: 'https://guide.michelin.com/en/busan-region/busan_1025838/restaurant/arp' },
]

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })
    if (!res.ok) { console.log(`    HTML fetch failed: ${res.status}`); return null }
    return await res.text()
  } catch (e: any) {
    console.log(`    HTML fetch err: ${e.message}`)
    return null
  }
}

function bestMichelinImg(html: string): string | null {
  // Michelin uses a content API with media URLs like
  // https://axwwgrkdco.cloudimg.io/v7/https://.../restaurant-xxxxx.jpg
  // or their own axwwgrkdco.cloudimg.io proxy. Pull the first large one.
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<img[^>]+class=["'][^"']*restaurant[^"']*["'][^>]+src=["']([^"']+)["']/i,
    /<img[^>]+data-lazy[^>]+src=["']([^"']+(?:axwwgrkdco|michelin)[^"']+)["']/i,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1]
  }
  // Fallback: find any axwwgrkdco (Michelin's CDN) image, preferring larger ones
  const cdnRegex = /(https?:\/\/axwwgrkdco\.cloudimg\.io\/[^"'\s]+\.(?:jpg|jpeg|png|webp))/gi
  const found: string[] = []
  let m: RegExpExecArray | null
  while ((m = cdnRegex.exec(html)) !== null) found.push(m[1])
  if (found.length > 0) return found[0]
  return null
}

async function uploadImage(placeId: string, imgUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imgUrl, { headers: { 'User-Agent': UA, Accept: 'image/*' }, signal: AbortSignal.timeout(15000), redirect: 'follow' })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 3000) return null
    const normalized = await sharp(buf).rotate().resize({
      width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true,
    }).jpeg({ quality: 88 }).toBuffer()
    const key = `${placeId}.jpg`
    const { error } = await sb.storage.from('place-images').upload(key, normalized, {
      contentType: 'image/jpeg', upsert: true,
      cacheControl: 'public, max-age=31536000, immutable',
    })
    if (error) { console.log(`    upload fail: ${error.message}`); return null }
    return sb.storage.from('place-images').getPublicUrl(key).data.publicUrl
  } catch { return null }
}

async function main() {
  for (const t of TARGETS) {
    console.log(`\n→ ${t.slug}`)
    const html = await fetchHtml(t.michelinUrl)
    if (!html) continue
    const img = bestMichelinImg(html)
    if (!img) { console.log('    no image URL found in Michelin HTML'); continue }
    console.log(`    found: ${img.slice(0, 120)}`)
    const { data: row } = await sb.from('places').select('id').eq('slug', t.slug).maybeSingle()
    if (!row) continue
    const stored = await uploadImage((row as any).id, img)
    if (stored) {
      await sb.from('places').update({ main_image_url: stored }).eq('id', (row as any).id)
      console.log(`    ✓ stored`)
    } else {
      console.log(`    ✗ upload failed`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
