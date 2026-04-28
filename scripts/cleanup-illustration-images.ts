/**
 * Cleanup: null out main_image_url and strip images[] entries that match
 * illustration / sketch / decorative-asset patterns. These polluted columns
 * show up as wrong og:image previews on social shares and hurt Google's
 * quality signals.
 *
 * Mutates `places.main_image_url` and `places.images` only. Does NOT delete
 * records. Run with --dry to preview.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { isLikelyRealPhoto } from '../src/lib/places/og-image'

dotenv.config({ path: '.env.local' })

const dryRun = process.argv.includes('--dry')

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const markers = [
    'Illustration_', 'illustration-', 'illustration.',
    'Drawing_', 'Sketch_', 'Engraving_', 'Lithograph_', 'Painting_',
    'Map_of_', 'Plan_of_', 'Coat_of_arms', '_c.18', '_c.19',
    '19th_century', '18th_century', 'handsketched', 'hand_drawn',
  ]
  const orMain = markers.map(m => `main_image_url.ilike.%${m}%`).join(',')

  const { data: rows, error } = await sb
    .from('places')
    .select('id, slug, name, city, main_image_url, images')
    .or(orMain)
    .is('archived_at', null)

  if (error) throw error
  console.log(`Found ${rows?.length ?? 0} places with illustration-marker main_image_url`)

  let mutated = 0
  for (const p of rows ?? []) {
    const cleanedImages = (p.images ?? []).filter((u: string) => isLikelyRealPhoto(u))
    const update: Record<string, unknown> = {}
    if (!isLikelyRealPhoto(p.main_image_url)) update.main_image_url = null
    if (cleanedImages.length !== (p.images?.length ?? 0)) update.images = cleanedImages
    if (Object.keys(update).length === 0) continue

    console.log(
      `${dryRun ? '[dry] ' : ''}${p.city ?? '-'} | ${p.name} | ` +
      `${p.main_image_url ? 'main→null' : ''} ` +
      `${update.images ? `images:${(p.images?.length ?? 0)}→${cleanedImages.length}` : ''}`
    )
    if (!dryRun) {
      const { error: upErr } = await sb.from('places').update(update).eq('id', p.id)
      if (upErr) console.error(`  ! update failed: ${upErr.message}`)
      else mutated++
    }
  }

  console.log(`Done. ${dryRun ? 'Would mutate' : 'Mutated'} ${dryRun ? rows?.length ?? 0 : mutated} rows.`)
  console.log('Tip: re-run scripts/_aggressive_imgs.ts on these slugs to fetch real photos.')
}

main().catch(e => { console.error(e); process.exit(1) })
