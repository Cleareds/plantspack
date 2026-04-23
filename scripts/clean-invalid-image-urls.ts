/**
 * Null out any main_image_url / images[] entry that isn't a proper absolute
 * http(s) URL.
 *
 * The HEAD audit only caught URLs that RESOLVED but returned 4xx. A second
 * class of bad URLs never made it into the browser's <img> request pipeline
 * properly in the first place:
 *   - JSON-escaped `https:\/\/...` stored without unescaping
 *   - HTML-entity-encoded `https&#x3A;&#x2F;&#x2F;...`
 *   - Root-relative `/android-icon-192x192.png` (points at plantspack.com root,
 *     not the scraped site — always 404)
 *   - Relative `./locations/dortmund/fbshare.jpg`
 *   - data:image/png;base64,... (massive inline images that bloat responses)
 *
 * These showed as broken-image icons or grey blocks on leaf pages. Null them
 * so the PlaceImage fallback renders instead. OG scraper can pick them up on
 * a later re-run.
 *
 * USAGE:
 *   tsx scripts/clean-invalid-image-urls.ts --dry-run
 *   tsx scripts/clean-invalid-image-urls.ts --commit
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const DRY_RUN = !process.argv.includes('--commit')

function isValidAbsoluteHttpUrl(s: string): boolean {
  if (!s || typeof s !== 'string') return false
  // Must be absolute http(s). Rejects data:, /, ./, ../, backslash-escaped,
  // HTML-entity-encoded.
  if (!/^https?:\/\/[^\s<>"'\\]+$/i.test(s)) return false
  try {
    new URL(s)
    return true
  } catch {
    return false
  }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : '*** LIVE ***'}`)

  // Paginate all places with at least one image.
  const rows: any[] = []
  let offset = 0
  while (true) {
    const { data } = await sb
      .from('places')
      .select('id, slug, main_image_url, images')
      .is('archived_at', null)
      .range(offset, offset + 999)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < 1000) break
    offset += 1000
  }
  console.log(`Loaded ${rows.length} places`)

  let mainNulled = 0
  let imagesFiltered = 0
  let placesUpdated = 0

  for (const r of rows) {
    const updates: { main_image_url?: string | null; images?: string[] | null } = {}

    // Check main_image_url
    if (r.main_image_url && !isValidAbsoluteHttpUrl(r.main_image_url)) {
      updates.main_image_url = null
      mainNulled++
    }

    // Filter images[]
    if (Array.isArray(r.images) && r.images.length > 0) {
      const keep = r.images.filter((u: any) => isValidAbsoluteHttpUrl(u))
      if (keep.length !== r.images.length) {
        updates.images = keep.length > 0 ? keep : null
        imagesFiltered += r.images.length - keep.length
      }
    }

    if (Object.keys(updates).length > 0) {
      placesUpdated++
      if (mainNulled <= 10 || imagesFiltered <= 10) {
        console.log(`  ${r.slug}  main=${r.main_image_url?.slice(0, 80) || ''}  keep=${Array.isArray(updates.images) ? updates.images.length : 'n/a'}`)
      }
      if (!DRY_RUN) {
        const { error } = await sb.from('places').update(updates).eq('id', r.id)
        if (error) console.error(`  UPDATE failed for ${r.id}:`, error.message)
      }
    }
  }

  console.log(`\nDone.`)
  console.log(`  main_image_url nulled: ${mainNulled}`)
  console.log(`  images[] entries removed: ${imagesFiltered}`)
  console.log(`  Places ${DRY_RUN ? 'to update' : 'updated'}: ${placesUpdated}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
