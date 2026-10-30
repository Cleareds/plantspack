// Canada audit 2026-10-30 second pass: hero image for fully_vegan rows without one.
// Input: JSON [{ id, slug, page }] where page is the venue's OWN site. Scrapes og/hero image,
// rehosts it to place-images and records provenance in image_sources (rehostImage does both).
// Usage: npx tsx scripts/_canada-audit-2026-10-30b-images.ts <images.json> [--apply]
import fs from 'node:fs'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { scrapeHeroImage, rehostImage } from './lib/hero-image'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const items: { id: string; slug: string; page: string }[] = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
async function main() {
for (const it of items) {
  const { data: p } = await sb.from('places').select('main_image_url,images').eq('id', it.id).single()
  if (p?.main_image_url) { console.log('HAS IMAGE', it.slug); continue }
  const img = await scrapeHeroImage(it.page)
  console.log(it.slug.padEnd(45), img ?? 'no image found')
  if (!img || !APPLY) continue
  const r = await rehostImage(sb, it.id, img, it.page)
  if ('error' in r) { console.log('  rehost failed:', r.error); continue }
  const { error } = await sb.from('places').update({ main_image_url: r.publicUrl, images: p?.images?.length ? p.images : [r.publicUrl] }).eq('id', it.id)
  if (error) console.log('  update failed:', error.message)
}
}
main()
