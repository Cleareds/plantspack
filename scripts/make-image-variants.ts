/**
 * Make the small WebP variants that SmartImg / PlaceImage load through srcSet
 * (see src/lib/image-variants.ts). Replaces Vercel image optimisation, which
 * billed per transformation. sharp runs locally: no paid API.
 *
 * Sources: places.main_image_url + places.images[] (place-images bucket) and
 * public/data/city-images.json (city-images bucket). Only URLs in our own
 * buckets are used. Existing variants are skipped, so re-runs only do new or
 * replaced images (a replaced image has a new ?v token = a new variant name).
 *
 * Only adds files under {bucket}/variants/. Never deletes or edits rows.
 *
 *   npx tsx scripts/make-image-variants.ts [--dry-run] [--limit N] [--concurrency 6]
 */
import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { VARIANT_WIDTHS, variantName } from '../src/lib/image-variants'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const OWN = /\/storage\/v1\/object\/public\/(place-images|city-images)\/([^?#]+)(?:\?v=([\w-]+))?$/
const QUALITY: Record<number, number> = { 400: 70, 960: 75 }

const arg = (name: string) => {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const dryRun = process.argv.includes('--dry-run')
const limit = Number(arg('--limit') ?? Infinity)
const concurrency = Number(arg('--concurrency') ?? 6)

type Job = { url: string; bucket: string; file: string; v?: string }

function toJob(url: string | null | undefined): Job | null {
  if (!url) return null
  const m = OWN.exec(url)
  if (!m || m[2].startsWith('variants/')) return null
  return { url, bucket: m[1], file: m[2], v: m[3] }
}

async function collectJobs(): Promise<Job[]> {
  const jobs: Record<string, Job> = {}
  const add = (u: string | null | undefined) => {
    const j = toJob(u)
    if (j) jobs[j.url] = j
  }

  // Cursor by id: PostgREST caps every read at 1000 rows.
  let cursor = '00000000-0000-0000-0000-000000000000'
  for (;;) {
    const { data, error } = await sb
      .from('places')
      .select('id, main_image_url, images')
      .is('archived_at', null)
      .gt('id', cursor)
      .order('id')
      .limit(1000)
    if (error) throw error
    if (!data?.length) break
    for (const p of data) {
      add(p.main_image_url)
      for (const u of (p.images as string[] | null) ?? []) add(u)
    }
    cursor = data[data.length - 1].id
  }

  const cityImages: Record<string, string> = JSON.parse(readFileSync('public/data/city-images.json', 'utf-8'))
  Object.values(cityImages).forEach(add)
  return Object.values(jobs)
}

async function listVariants(bucket: string): Promise<Record<string, true>> {
  const have: Record<string, true> = {}
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb.storage.from(bucket).list('variants', { limit: 1000, offset })
    if (error) throw error
    for (const f of data ?? []) have[`variants/${f.name}`] = true
    if (!data || data.length < 1000) break
  }
  return have
}

async function main() {
  const all = await collectJobs()
  const have: Record<string, Record<string, true>> = {
    'place-images': await listVariants('place-images'),
    'city-images': await listVariants('city-images'),
  }
  const todo = all
    .filter((j) => VARIANT_WIDTHS.some((w) => !have[j.bucket][variantName(j.file, j.v)(w)]))
    .slice(0, limit)
  console.log(`${all.length} own-storage images, ${todo.length} need variants (dry-run=${dryRun})`)

  let ok = 0, failed = 0, bytesIn = 0, bytesOut = 0
  let next = 0
  async function worker() {
    while (next < todo.length) {
      const job = todo[next++]
      try {
        const res = await fetch(job.url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const buf = Buffer.from(await res.arrayBuffer())
        bytesIn += buf.length
        const name = variantName(job.file, job.v)
        for (const w of VARIANT_WIDTHS) {
          const out = await sharp(buf)
            .rotate()
            .resize(w, null, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: QUALITY[w] })
            .toBuffer()
          bytesOut += out.length
          if (dryRun) continue
          const { error } = await sb.storage.from(job.bucket).upload(name(w), out, {
            contentType: 'image/webp', upsert: true, cacheControl: '31536000',
          })
          if (error) throw error
        }
        ok++
      } catch (e) {
        failed++
        console.log(`  fail ${job.url}: ${(e as Error).message}`)
      }
      const done = ok + failed
      if (done % 200 === 0) {
        console.log(`  ${done}/${todo.length} ok=${ok} failed=${failed} in=${(bytesIn / 1e6).toFixed(0)}MB out=${(bytesOut / 1e6).toFixed(0)}MB`)
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  console.log(`done: ok=${ok} failed=${failed} in=${(bytesIn / 1e6).toFixed(0)}MB out=${(bytesOut / 1e6).toFixed(0)}MB`)
}

main().catch((e) => { console.error(e); process.exit(1) })
