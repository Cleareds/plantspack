// Re-fetch high-resolution Wikipedia images for summer hub cities only.
// Replaces the 640px thumbnails with 1600px+ originals, re-uploads to Supabase,
// updates public/data/city-images.json with fresh cache-bust.
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const BUCKET = 'city-images'
const UA = 'PlantsPack/1.0 (https://plantspack.com; info@plantspack.com) summer-hub-quality-fix'

const SUMMER_HUB = [
  ['Rome','Italy'], ['Florence','Italy'], ['Naples','Italy'], ['Venice','Italy'], ['Palermo','Italy'], ['Catania','Italy'],
  ['Barcelona','Spain'], ['Madrid','Spain'], ['Valencia','Spain'], ['Ibiza','Spain'], ['Palma de Mallorca','Spain'], ['Santa Cruz de Tenerife','Spain'],
  ['Athens','Greece'], ['Santorini','Greece'], ['Mykonos','Greece'], ['Naxos','Greece'], ['Corfu','Greece'], ['Heraklion','Greece'],
  ['Lisbon','Portugal'], ['Porto','Portugal'], ['Faro','Portugal'], ['Lagos','Portugal'], ['Funchal','Portugal'],
  ['Zagreb','Croatia'], ['Split','Croatia'], ['Dubrovnik','Croatia'], ['Pula','Croatia'],
  ['Istanbul','Turkey'], ['Antalya','Turkey'],
]

// Manual disambiguation overrides to avoid the wrong-article issue (e.g. "Rome" → Roman empire)
const WIKI_TITLE_OVERRIDE = {
  'Rome|||Italy': 'Rome',
  'Florence|||Italy': 'Florence',
  'Naples|||Italy': 'Naples',
  'Venice|||Italy': 'Venice',
  'Palermo|||Italy': 'Palermo',
  'Catania|||Italy': 'Catania',
  'Barcelona|||Spain': 'Barcelona',
  'Madrid|||Spain': 'Madrid',
  'Valencia|||Spain': 'Valencia',
  'Ibiza|||Spain': 'Ibiza',
  'Palma de Mallorca|||Spain': 'Palma de Mallorca',
  'Santa Cruz de Tenerife|||Spain': 'Santa Cruz de Tenerife',
  'Athens|||Greece': 'Athens',
  'Santorini|||Greece': 'Santorini',
  'Mykonos|||Greece': 'Mykonos',
  'Naxos|||Greece': 'Naxos',
  'Corfu|||Greece': 'Corfu',
  'Heraklion|||Greece': 'Heraklion',
  'Lisbon|||Portugal': 'Lisbon',
  'Porto|||Portugal': 'Porto',
  'Faro|||Portugal': 'Faro, Portugal',
  'Lagos|||Portugal': 'Lagos, Portugal',
  'Funchal|||Portugal': 'Funchal',
  'Zagreb|||Croatia': 'Zagreb',
  'Split|||Croatia': 'Split, Croatia',
  'Dubrovnik|||Croatia': 'Dubrovnik',
  'Pula|||Croatia': 'Pula',
  'Istanbul|||Turkey': 'Istanbul',
  'Antalya|||Turkey': 'Antalya',
}

async function fetchWikiSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g,'_'))}`
  const r = await fetch(url, { headers: { 'User-Agent': UA }})
  if (!r.ok) return null
  return r.json()
}

function pickBestImageUrl(j) {
  // Prefer originalimage (full resolution) over thumbnail
  if (j.originalimage?.source) return j.originalimage.source
  if (j.thumbnail?.source) {
    // Force largest size: replace /Npx- with /1600px-
    return j.thumbnail.source.replace(/\/\d+px-/, '/1600px-')
  }
  return null
}

async function downloadAndNormalize(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
  if (!r.ok) return null
  const buf = Buffer.from(await r.arrayBuffer())
  if (buf.length < 5000) return null
  // Resize to 1600x900 hero (crop to fit), quality 85 webp
  const out = await sharp(buf)
    .rotate()
    .resize({ width: 1600, height: 900, fit: 'cover', position: 'center' })
    .webp({ quality: 85, effort: 4 })
    .toBuffer()
  return out
}

const cityImages = JSON.parse(readFileSync('public/data/city-images.json', 'utf-8'))
const ts = Date.now().toString(36)
let ok = 0, fail = 0

for (const [city, country] of SUMMER_HUB) {
  const key = `${city}|||${country}`
  const title = WIKI_TITLE_OVERRIDE[key] || city
  process.stdout.write(`  ${city.padEnd(28)} ${country.padEnd(12)} `)
  const summary = await fetchWikiSummary(title)
  if (!summary) { console.log('no wiki'); fail++; continue }
  const srcUrl = pickBestImageUrl(summary)
  if (!srcUrl) { console.log('no img'); fail++; continue }
  const dims = summary.originalimage ? `${summary.originalimage.width}x${summary.originalimage.height}` : 'thumb-only'
  process.stdout.write(`(${dims}) `)
  const normalized = await downloadAndNormalize(srcUrl)
  if (!normalized) { console.log('download/normalize failed'); fail++; continue }
  // Upload to Supabase
  const slug = key.replace(/\|\|\|/g,'--').replace(/[^a-zA-Z0-9\-]/g,'_').toLowerCase()
  const fileName = `${slug}.webp`
  const { error } = await sb.storage.from(BUCKET).upload(fileName, normalized, {
    contentType: 'image/webp', upsert: true,
  })
  if (error) { console.log(`upload err: ${error.message}`); fail++; continue }
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(fileName)
  cityImages[key] = `${pub.publicUrl}?v=${ts}`
  console.log(`✓ ${Math.round(normalized.length/1024)}KB`)
  ok++
  await new Promise(r => setTimeout(r, 800))  // be nice to Wikipedia
}
writeFileSync('public/data/city-images.json', JSON.stringify(cityImages, null, 2))
console.log(`\nDone. ${ok} upgraded, ${fail} failed. Cache-bust: ?v=${ts}`)
