#!/usr/bin/env tsx
/**
 * Attach a `main_image_url` to an existing place.
 *
 * The companion to `scripts/add-place.ts`: when the add-place scraper fails
 * (JS-rendered site, no OG image, lazy-loaded hero, etc.) the add-place
 * skill instructs Claude to fall back to chrome-devtools MCP to find a real
 * image URL, then pipe that URL to this script to download + re-host it on
 * the Supabase `place-images` bucket.
 *
 * Usage:
 *   tsx scripts/attach-place-image.ts --slug <place-slug> --url <image-url>
 *   tsx scripts/attach-place-image.ts --id   <place-id>   --url <image-url>
 *
 * The image is downloaded, normalised via sharp (rotated, resized to max
 * 1600×1600, JPEG q=88), and uploaded as `{place_id}.jpg` with immutable
 * cache headers. places.main_image_url is updated to the public URL.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import sharp from 'sharp'

config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const slug = arg('--slug')
  const id = arg('--id')
  const url = arg('--url')
  if (!url || (!slug && !id)) {
    console.error('Usage: tsx scripts/attach-place-image.ts --slug|--id <value> --url <image-url>')
    process.exit(1)
  }
  if (!/^https?:\/\//i.test(url)) {
    console.error('ABORT: --url must be an absolute http(s) URL')
    process.exit(1)
  }

  const { data: place, error: qErr } = slug
    ? await sb.from('places').select('id, slug, name').eq('slug', slug).maybeSingle()
    : await sb.from('places').select('id, slug, name').eq('id', id!).maybeSingle()
  if (qErr || !place) {
    console.error('place not found:', qErr?.message || 'no row')
    process.exit(1)
  }
  const p = place as any

  console.log(`target: ${p.name} (${p.slug})`)
  console.log(`source: ${url}`)

  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'image/*' },
    signal: AbortSignal.timeout(20000),
    redirect: 'follow',
  })
  if (!res.ok) { console.error(`download failed: ${res.status}`); process.exit(1) }
  const ct = res.headers.get('content-type') || ''
  if (!ct.startsWith('image/')) { console.error(`not an image (content-type=${ct})`); process.exit(1) }
  const raw = Buffer.from(await res.arrayBuffer())
  console.log(`downloaded: ${(raw.length / 1024).toFixed(0)} KB`)

  const normalized = await sharp(raw).rotate().resize({
    width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true,
  }).jpeg({ quality: 88 }).toBuffer()

  const key = `${p.id}.jpg`
  const { error: upErr } = await sb.storage.from('place-images').upload(key, normalized, {
    contentType: 'image/jpeg',
    upsert: true,
    cacheControl: 'public, max-age=31536000, immutable',
  })
  if (upErr) { console.error(`upload fail: ${upErr.message}`); process.exit(1) }

  const publicUrl = sb.storage.from('place-images').getPublicUrl(key).data.publicUrl
  const { error: updErr } = await sb.from('places').update({ main_image_url: publicUrl }).eq('id', p.id)
  if (updErr) { console.error(`db update fail: ${updErr.message}`); process.exit(1) }

  console.log(`✓ stored + wired: ${publicUrl}`)
  console.log(`  visible at: https://plantspack.com/place/${p.slug}`)
}

main().catch(e => { console.error(e); process.exit(1) })
