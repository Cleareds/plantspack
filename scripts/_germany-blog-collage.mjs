// Build a 3x2 city collage thumbnail (1500x900) from existing Supabase
// city-images (already 1600x900 webp) for the Germany blog post.
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const cityImages = JSON.parse(readFileSync('public/data/city-images.json','utf-8'))
const CITIES = ['Hamburg','Munich','Nuremberg','Leipzig','Cologne','Dresden']

const COLS = 3, ROWS = 2
const FINAL_W = 1500, FINAL_H = 900
const TW = FINAL_W / COLS, TH = FINAL_H / ROWS

const tiles = []
for (const city of CITIES) {
  const key = `${city}|||Germany`
  const url = cityImages[key]
  if (!url) { console.log(`✗ ${city}: missing in city-images.json`); continue }
  const r = await fetch(url.split('?')[0])
  const buf = Buffer.from(await r.arrayBuffer())
  const tile = await sharp(buf).resize({width: TW, height: TH, fit: 'cover', position: 'center'}).toBuffer()
  tiles.push(tile)
  console.log(`✓ ${city}: tile ${TW}x${TH}`)
}

const composites = tiles.map((tile, i) => ({
  input: tile,
  left: (i % COLS) * TW,
  top: Math.floor(i / COLS) * TH,
}))

const final = await sharp({ create: { width: FINAL_W, height: FINAL_H, channels: 3, background: '#000' }})
  .composite(composites).webp({ quality: 88 }).toBuffer()

console.log(`\nFinal: ${FINAL_W}x${FINAL_H}, ${Math.round(final.length/1024)}KB`)

const fileName = `beyond-berlin-germany-collage-${Date.now().toString(36)}.webp`
await sb.storage.createBucket('blog-images', { public: true }).catch(()=>{})
const { error } = await sb.storage.from('blog-images').upload(fileName, final, { contentType: 'image/webp', upsert: true })
if (error) {
  console.log(`blog-images err: ${error.message}, trying city-images bucket`)
  const { error: e2 } = await sb.storage.from('city-images').upload(fileName, final, { contentType: 'image/webp', upsert: true })
  if (e2) { console.log(`✗ ${e2.message}`); process.exit(1) }
  const { data: pub } = sb.storage.from('city-images').getPublicUrl(fileName)
  console.log(`✓ ${pub.publicUrl}`)
} else {
  const { data: pub } = sb.storage.from('blog-images').getPublicUrl(fileName)
  console.log(`✓ ${pub.publicUrl}`)
}
