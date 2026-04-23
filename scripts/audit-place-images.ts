/**
 * HEAD-check every place image URL in the DB. Null out any URL returning
 * 4xx/5xx (dead CDN links, expired tokens, deleted scraped images).
 *
 * Why: broken images hurt CTR, signal low quality to Google, and when
 * submitted in an image sitemap they become 404 entries that waste crawl
 * budget. Cleaning these up is table-stakes before submitting an image
 * sitemap.
 *
 * Scope: places.main_image_url and every entry in places.images[].
 *
 * USAGE:
 *   tsx scripts/audit-place-images.ts --dry-run
 *   tsx scripts/audit-place-images.ts --commit
 *   tsx scripts/audit-place-images.ts --commit --only-main        # skip images[]
 *   tsx scripts/audit-place-images.ts --commit --limit 500        # partial run
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const DRY_RUN = !process.argv.includes('--commit')
const ONLY_MAIN = process.argv.includes('--only-main')
const LIMIT_IDX = process.argv.indexOf('--limit')
const LIMIT = LIMIT_IDX >= 0 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : Infinity
const CONCURRENCY = 20
const TIMEOUT_MS = 8000

async function checkUrl(url: string): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    // Some CDNs reject HEAD (Wix especially) — fall back to a ranged GET if HEAD
    // returns 405 or 403. Range: bytes=0-0 fetches one byte.
    let res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' })
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        signal: controller.signal,
        redirect: 'follow',
      })
    }
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

async function processInPool<T>(items: T[], handler: (item: T) => Promise<void>) {
  let i = 0
  async function worker() {
    while (i < items.length) {
      const myIdx = i++
      await handler(items[myIdx])
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : '*** LIVE (writing to DB) ***'}`)
  console.log(`Scope: ${ONLY_MAIN ? 'main_image_url only' : 'main_image_url + images[]'}`)
  if (LIMIT !== Infinity) console.log(`Limit: first ${LIMIT} rows`)

  // Fetch all candidates in one go — 20K rows is <20 MB.
  const all: Array<{ id: string; main_image_url: string | null; images: string[] | null }> = []
  let offset = 0
  while (true) {
    const { data } = await sb
      .from('places')
      .select('id, main_image_url, images')
      .is('archived_at', null)
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    all.push(...(data as any[]))
    if (data.length < 1000) break
    offset += 1000
  }
  console.log(`Loaded ${all.length} places`)

  let rowsProcessed = 0
  let mainChecked = 0
  let mainBroken = 0
  let extraChecked = 0
  let extraBroken = 0
  let placesUpdated = 0

  const targets = all.filter(p => p.main_image_url || (p.images && p.images.length > 0)).slice(0, LIMIT)
  console.log(`Targets with at least one image URL: ${targets.length}`)

  const startedAt = Date.now()
  let lastLogAt = Date.now()

  await processInPool(targets, async (p) => {
    const updates: { main_image_url?: string | null; images?: string[] | null } = {}

    // Main image
    if (p.main_image_url) {
      mainChecked++
      const ok = await checkUrl(p.main_image_url)
      if (!ok) {
        mainBroken++
        updates.main_image_url = null
      }
    }

    // Additional images
    if (!ONLY_MAIN && p.images && p.images.length > 0) {
      const keep: string[] = []
      for (const u of p.images) {
        extraChecked++
        if (await checkUrl(u)) {
          keep.push(u)
        } else {
          extraBroken++
        }
      }
      if (keep.length !== p.images.length) {
        updates.images = keep.length > 0 ? keep : null
      }
    }

    if (Object.keys(updates).length > 0) {
      placesUpdated++
      if (!DRY_RUN) {
        const { error } = await sb.from('places').update(updates).eq('id', p.id)
        if (error) console.error(`  UPDATE failed for ${p.id}:`, error.message)
      }
    }

    rowsProcessed++
    if (Date.now() - lastLogAt > 5000) {
      const elapsedSec = (Date.now() - startedAt) / 1000
      const rate = (rowsProcessed / elapsedSec).toFixed(1)
      console.log(`  ${rowsProcessed}/${targets.length} places checked (${rate}/s) — broken: main=${mainBroken} images[]=${extraBroken}`)
      lastLogAt = Date.now()
    }
  })

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`\nDone in ${elapsed}s.`)
  console.log(`  Checked: main_image_url=${mainChecked}, images[]=${extraChecked}`)
  console.log(`  Broken:  main_image_url=${mainBroken}, images[]=${extraBroken}`)
  console.log(`  Places ${DRY_RUN ? 'to update' : 'updated'}: ${placesUpdated}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
