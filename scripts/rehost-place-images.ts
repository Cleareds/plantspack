/**
 * Overnight batch: re-host external place images on Supabase Storage as WebP.
 *
 * What it does, per place with an external main_image_url:
 *   1. Fetch the original image (with browser-like UA so Shopify/Wix don't 403)
 *   2. Resize to max 1200px wide via sharp (preserves aspect, no upscale)
 *   3. Re-encode as WebP at quality 80
 *   4. Upload to supabase://place-images/{place-id}.webp (1-year cache)
 *   5. Atomically UPDATE places.main_image_url + replace the matching entry
 *      in places.images[] with the new Supabase URL. External URL is kept
 *      as a secondary entry in images[] as a fallback.
 *
 * Production-safety guards:
 *   - Hard rule: never delete any data. Only UPDATE one place row at a time.
 *   - Skip if main_image_url already points at supabase.co (already re-hosted).
 *   - Skip if fetch returns non-image content-type (catches HTML 404 pages
 *     dressed as 200s from misconfigured CDNs).
 *   - Skip if original is < 8 KB (almost certainly an icon/logo/placeholder).
 *   - Cursor-paginated by id so we don't crash on the same row twice; safe
 *     to interrupt with Ctrl-C and resume.
 *   - Rate-limit: 1.2s between fetches to be polite to 3rd-party CDNs.
 *   - Hard cap on runtime via --max-hours (default 8) so it self-terminates.
 *   - --dry-run flag prints what it would do without writing anything.
 *
 * Resumability: stores progress in scripts/seo-out/rehost-progress.json
 * (last-cursor + counts) every 50 places so a re-run picks up where it
 * left off.
 */
import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BUCKET = 'place-images'
const MAX_WIDTH = 1200
const QUALITY = 80
const RATE_MS = 1200
const PAGE_SIZE = 100
const FETCH_TIMEOUT_MS = 15000
const PROGRESS_PATH = 'scripts/seo-out/rehost-progress.json'

// Browser-ish User-Agent so Shopify, WordPress, S3 hot-linked images don't 403
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

type Place = {
  id: string
  name: string
  main_image_url: string | null
  images: string[] | null
}

type Progress = {
  cursor: string | null
  ok: number
  skipped: number
  failed: number
  bytesBefore: number
  bytesAfter: number
  startedAt: string
  updatedAt: string
}

function loadProgress(): Progress {
  if (existsSync(PROGRESS_PATH)) {
    try { return JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8')) } catch { /* fall through */ }
  }
  return {
    cursor: null, ok: 0, skipped: 0, failed: 0,
    bytesBefore: 0, bytesAfter: 0,
    startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
}

function saveProgress(p: Progress) {
  mkdirSync(dirname(PROGRESS_PATH), { recursive: true })
  p.updatedAt = new Date().toISOString()
  writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2))
}

async function fetchImage(url: string): Promise<{ buf: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'image/*,*/*' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return { buf, contentType: ct }
  } catch { return null }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const maxHoursArg = process.argv.indexOf('--max-hours')
  const maxHours = maxHoursArg >= 0 ? parseFloat(process.argv[maxHoursArg + 1]) : 8
  const limitArg = process.argv.indexOf('--limit')
  const limit = limitArg >= 0 ? parseInt(process.argv[limitArg + 1], 10) : Infinity
  const resetArg = process.argv.includes('--reset')

  const startMs = Date.now()
  const deadlineMs = startMs + maxHours * 3600_000

  let progress = loadProgress()
  if (resetArg) progress = { cursor: null, ok: 0, skipped: 0, failed: 0, bytesBefore: 0, bytesAfter: 0, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  console.log(`Re-host start. dry-run=${dryRun}, maxHours=${maxHours}, limit=${limit === Infinity ? '-' : limit}, resume from cursor=${progress.cursor || '(start)'}`)
  console.log(`Initial counters: ok=${progress.ok} skipped=${progress.skipped} failed=${progress.failed}\n`)

  let iterations = 0
  while (Date.now() < deadlineMs && iterations < limit) {
    let q = sb.from('places')
      .select('id, name, main_image_url, images')
      .not('main_image_url', 'is', null)
      .not('main_image_url', 'like', '%supabase.co%')
      .order('id', { ascending: true })
      .limit(PAGE_SIZE)
    if (progress.cursor) q = q.gt('id', progress.cursor)

    const { data, error } = await q
    if (error) { console.error(`Page fetch err: ${error.message}`); break }
    if (!data || data.length === 0) {
      console.log(`No more places to process. Done.`)
      break
    }

    for (const place of data as Place[]) {
      if (Date.now() >= deadlineMs || iterations >= limit) break
      iterations++

      const externalUrl = place.main_image_url!
      const fetched = await fetchImage(externalUrl)
      if (!fetched) {
        progress.skipped++
        progress.cursor = place.id
        if (iterations % 50 === 0) saveProgress(progress)
        await new Promise(r => setTimeout(r, RATE_MS))
        continue
      }

      if (fetched.buf.length < 8_000) {
        // Tiny → almost certainly an icon, logo, or placeholder. Don't re-host.
        progress.skipped++
        progress.cursor = place.id
        if (iterations % 50 === 0) saveProgress(progress)
        await new Promise(r => setTimeout(r, RATE_MS))
        continue
      }

      try {
        const outBuf = await sharp(fetched.buf)
          .rotate() // honour EXIF orientation
          .resize(MAX_WIDTH, null, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toBuffer()

        if (dryRun) {
          progress.bytesBefore += fetched.buf.length
          progress.bytesAfter += outBuf.length
          progress.ok++
          progress.cursor = place.id
          console.log(`  [dry ${iterations}] ${place.id} ${place.name.slice(0, 30).padEnd(30)} ${(fetched.buf.length / 1024).toFixed(0)}KB -> ${(outBuf.length / 1024).toFixed(0)}KB`)
          continue
        }

        const path = `${place.id}.webp`
        const { error: upErr } = await sb.storage.from(BUCKET).upload(path, outBuf, {
          contentType: 'image/webp', upsert: true, cacheControl: '31536000',
        })
        if (upErr) {
          console.log(`  [upl-fail ${iterations}] ${place.name.slice(0, 30)}: ${upErr.message}`)
          progress.failed++
          progress.cursor = place.id
          if (iterations % 50 === 0) saveProgress(progress)
          await new Promise(r => setTimeout(r, RATE_MS))
          continue
        }

        const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(path)
        const newUrl = `${urlData.publicUrl}?v=${Date.now().toString(36)}`

        // Build new images[] array: replace the external URL with the new
        // Supabase URL, and keep external as a secondary fallback. Dedupe.
        const existing = place.images || []
        const replaced = existing.map(u => u === externalUrl ? newUrl : u)
        if (!replaced.includes(newUrl)) replaced.unshift(newUrl)
        if (!replaced.includes(externalUrl)) replaced.push(externalUrl)
        // Cap to 10 to avoid unbounded growth on noisy data
        const finalImages = Array.from(new Set(replaced)).slice(0, 10)

        const { error: updErr } = await sb.from('places')
          .update({ main_image_url: newUrl, images: finalImages })
          .eq('id', place.id)
        if (updErr) {
          console.log(`  [db-fail ${iterations}] ${place.name.slice(0, 30)}: ${updErr.message}`)
          progress.failed++
        } else {
          progress.ok++
          progress.bytesBefore += fetched.buf.length
          progress.bytesAfter += outBuf.length
          if (iterations % 25 === 0) {
            const elapsed = (Date.now() - startMs) / 60_000
            const rate = iterations / elapsed
            console.log(`  [${iterations}] ${place.name.slice(0, 28).padEnd(28)} ${(fetched.buf.length / 1024).toFixed(0)}KB->${(outBuf.length / 1024).toFixed(0)}KB | ok=${progress.ok} skip=${progress.skipped} fail=${progress.failed} | ${rate.toFixed(1)}/min`)
          }
        }
        progress.cursor = place.id
        if (iterations % 50 === 0) saveProgress(progress)
      } catch (e: any) {
        progress.failed++
        progress.cursor = place.id
        if (iterations % 50 === 0) saveProgress(progress)
        console.log(`  [exc ${iterations}] ${place.name.slice(0, 30)}: ${e?.message}`)
      }

      await new Promise(r => setTimeout(r, RATE_MS))
    }
  }

  saveProgress(progress)
  const elapsedMin = (Date.now() - startMs) / 60_000
  const totalMb = (progress.bytesBefore - progress.bytesAfter) / (1024 * 1024)
  console.log(`\n=== Done. Elapsed ${elapsedMin.toFixed(1)} min. ok=${progress.ok} skipped=${progress.skipped} failed=${progress.failed}. Saved ~${totalMb.toFixed(1)} MB. Last cursor: ${progress.cursor} ===`)
}

main().catch(e => { console.error(e); process.exit(1) })
