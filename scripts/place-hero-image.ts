#!/usr/bin/env tsx
/**
 * Give an existing place a hero image when it has none.
 *
 * Used by the approve-submissions skill after a mobile submission is
 * published without photos: scrapes the place's website with the same
 * multi-pass scraper add-place uses, re-hosts the winner on the Supabase
 * `place-images` bucket, and wires main_image_url + images.
 *
 * Usage:
 *   tsx scripts/place-hero-image.ts --id <place-id> [--website <url>] [--image-url <direct-url>] [--force]
 *
 * Exit codes: 0 = image attached (or already had one), 3 = no image found
 * (caller may fall back to chrome-devtools), 1 = hard error.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { scrapeHeroImage, rehostImage } from './lib/hero-image'

config({ path: '.env.local', quiet: true })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const id = arg('--id')
  if (!id) {
    console.error('Usage: tsx scripts/place-hero-image.ts --id <place-id> [--website <url>] [--image-url <url>] [--force]')
    process.exit(1)
  }

  const { data: place, error } = await sb.from('places')
    .select('id, slug, name, website, main_image_url, images')
    .eq('id', id).maybeSingle()
  if (error || !place) { console.error('place not found:', error?.message || 'no row'); process.exit(1) }

  if (place.main_image_url && !process.argv.includes('--force')) {
    console.log(`already has image: ${place.main_image_url}`)
    return
  }

  let imageUrl = arg('--image-url') || null
  if (!imageUrl) {
    const site = arg('--website') || place.website
    if (!site) { console.log('no website to scrape and no --image-url given'); process.exit(3) }
    console.log(`scraping ${site} ...`)
    imageUrl = await scrapeHeroImage(site)
    if (!imageUrl) { console.log(`no hero image found on ${site}`); process.exit(3) }
    console.log(`candidate: ${imageUrl.slice(0, 120)}`)
  }

  const hosted = await rehostImage(sb, place.id, imageUrl)
  if ('error' in hosted) { console.error(hosted.error); process.exit(1) }

  const images: string[] = place.images || []
  if (!images.includes(hosted.publicUrl)) images.unshift(hosted.publicUrl)
  const { error: updErr } = await sb.from('places')
    .update({ main_image_url: hosted.publicUrl, images })
    .eq('id', place.id)
  if (updErr) { console.error(`db update fail: ${updErr.message}`); process.exit(1) }

  console.log(`✓ image attached: ${hosted.publicUrl}`)
  console.log(`  visible at: https://plantspack.com/place/${place.slug}`)
}

main().catch(e => { console.error(e); process.exit(1) })
