/**
 * Re-fetches city hero images at 1600px width so region/country hero
 * surfaces (and the homepage guest banner) stop looking pixelated.
 * Wikimedia's action API takes a pithumbsize param that returns a
 * higher-res thumbnail on demand - costs nothing extra. Overwrites the
 * existing object in Supabase Storage.
 *
 * Originally a Belgium-only script; now accepts:
 *   --country <name>   restrict to one country (e.g. "Germany")
 *   --top-cities       restrict to A/B-grade cities only (banner pool)
 *   --skip-large       skip keys whose stored image is already > MIN_HIRES_BYTES
 *   --limit <N>        cap the number of cities processed
 * With no flags, processes every key in city-images.json (slow).
 *
 *   npx tsx scripts/upgrade-belgium-hero-images.ts --country Belgium
 *   npx tsx scripts/upgrade-belgium-hero-images.ts --top-cities --skip-large
 */
import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BUCKET = 'city-images'
const UA = 'Plants Pack/1.0'
const TARGET_WIDTH = 1600

/**
 * Resolve the Wikipedia page's lead-image file name, then ask Wikimedia
 * Commons' Special:FilePath endpoint to scale it to TARGET_WIDTH. That
 * endpoint always serves at the requested width, no matter how the lead
 * image is sized in the article. Falls back to the pithumbsize URL only
 * if the file name lookup fails.
 */
async function getHiResThumb(title: string, attempt = 0): Promise<string | null> {
  const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&pithumbsize=${TARGET_WIDTH}&format=json&origin=*`
  try {
    const res = await fetch(apiUrl, { headers: { 'User-Agent': UA, 'Accept': 'application/json' }, signal: AbortSignal.timeout(15000) })
    if (res.status === 429 || res.status >= 500) {
      // Wikipedia rate-limit / transient: back off and retry up to 3x
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
        return getHiResThumb(title, attempt + 1)
      }
      return null
    }
    if (!res.ok) return null
    const data = await res.json()
    const pages: any = data.query?.pages || {}
    for (const k of Object.keys(pages)) {
      const p = pages[k]
      const filename: string | undefined = p?.pageimage
      if (filename) {
        // Special:FilePath redirects to a CDN URL serving the file at the
        // requested pixel width. Underscore↔space normalization is handled
        // by Wikimedia.
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=${TARGET_WIDTH}`
      }
      if (p?.thumbnail?.source) return p.thumbnail.source
    }
    return null
  } catch (e:any) {
    if (attempt < 2 && (e?.name === 'TimeoutError' || e?.message?.includes('fetch'))) {
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
      return getHiResThumb(title, attempt + 1)
    }
    return null
  }
}

async function findHiRes(city: string, country: string): Promise<string | null> {
  // Bare name wins most often; fall back to disambiguated forms.
  const candidates = [city, `${city}, ${country}`, `${city} (${country})`]
  for (const q of candidates) {
    const u = await getHiResThumb(q)
    if (u) return u
    await new Promise(r => setTimeout(r, 250))
  }
  return null
}

function slugForKey(key: string): string {
  return key.replace(/\|\|\|/g, '--').replace(/[^a-zA-Z0-9\-]/g, '_').toLowerCase()
}

const MIN_HIRES_BYTES = 200_000

async function selectKeys(images: Record<string, string>): Promise<string[]> {
  const args = process.argv
  const countryIdx = args.indexOf('--country')
  const country = countryIdx >= 0 ? args[countryIdx + 1] : null
  const topCities = args.includes('--top-cities')
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity

  let keys = Object.keys(images)
  if (country) keys = keys.filter(k => k.endsWith(`|||${country}`))

  if (topCities) {
    // Restrict to A/B-grade cities (the banner candidate pool + city pages
    // most users actually visit). Anything else can be upgraded later.
    const { data } = await sb.from('city_scores').select('city, country, grade').in('grade', ['A+','A','B+','B'])
    const set = new Set((data || []).map((r: any) => `${r.city}|||${r.country}`))
    keys = keys.filter(k => set.has(k))
  }

  return keys.slice(0, limit)
}

async function main() {
  const images: Record<string, string> = JSON.parse(readFileSync('public/data/city-images.json', 'utf-8'))
  const skipLarge = process.argv.includes('--skip-large')
  const keys = await selectKeys(images)
  console.log(`${keys.length} city images to inspect (skip-large=${skipLarge})\n`)

  let upgraded = 0, kept = 0, failed = 0, skipped = 0
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const [cityRaw, country] = key.split('|||')
    const cityClean = cityRaw.split(' - ')[0].replace(/\s*\([^)]*\)\s*$/, '').trim()

    if (skipLarge) {
      // Skip keys whose stored image is already large enough to be hi-res.
      try {
        const head = await fetch(images[key], { method: 'HEAD' })
        const len = parseInt(head.headers.get('content-length') || '0', 10)
        if (len >= MIN_HIRES_BYTES) { skipped++; continue }
      } catch {}
    }

    const hiResUrl = await findHiRes(cityClean, country) || (cityClean !== cityRaw ? await findHiRes(cityRaw, country) : null)
    if (!hiResUrl) {
      kept++
      console.log(`  [${i + 1}/${keys.length}] ${cityClean}, ${country} - no hi-res available`)
      await new Promise(r => setTimeout(r, 700))
      continue
    }

    try {
      const imgRes = await fetch(hiResUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) })
      if (!imgRes.ok) { failed++; continue }
      const buf = Buffer.from(await imgRes.arrayBuffer())
      const slug = slugForKey(key)
      if (buf.length < 60_000) { kept++; await new Promise(r => setTimeout(r, 700)); continue }

      // URLs include a ?v=<id> cache-buster (added below), so we can safely
      // cache the bytes for a year. The previous 3600s default forced every
      // browser back to Supabase every hour and tanked homepage LCP.
      const { error } = await sb.storage.from(BUCKET).upload(`${slug}.jpg`, buf, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' })
      if (error) { failed++; console.log(`  [${i + 1}/${keys.length}] ${cityClean} - upload err: ${error.message}`); continue }
      upgraded++
      const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(`${slug}.jpg`)
      images[key] = `${urlData.publicUrl}?v=${Date.now().toString(36)}`
      console.log(`  [${i + 1}/${keys.length}] ${cityClean}, ${country} OK ${(buf.length/1024).toFixed(0)}KB`)
    } catch (e: any) {
      failed++
      console.log(`  [${i + 1}/${keys.length}] ${cityClean} - exception: ${e?.message}`)
    }

    if ((i + 1) % 10 === 0) writeFileSync('public/data/city-images.json', JSON.stringify(images, null, 2))
    await new Promise(r => setTimeout(r, 700))
  }

  writeFileSync('public/data/city-images.json', JSON.stringify(images, null, 2))
  console.log(`\nDone. ${upgraded} re-uploaded at ${TARGET_WIDTH}px, ${kept} kept (no hi-res), ${skipped} skipped (already hi-res), ${failed} failed.`)
}

main().catch(e => { console.error(e); process.exit(1) })
