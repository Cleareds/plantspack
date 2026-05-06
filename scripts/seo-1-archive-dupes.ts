/**
 * Apply the dedup decisions from seo-out/duplicates.json:
 *   - move user-generated data (reviews, favorites, pack_places) from loser to keeper
 *   - insert loser.slug -> keeper.id into place_slug_aliases for 301 redirects
 *   - archive the loser (archived_at + archived_reason)
 *
 * Re-runnable: skips already-archived losers.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const data = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'scripts', 'seo-out', 'duplicates.json'), 'utf8')
  )
  const confirmed = data.confirmed as any[]
  console.log(`Applying ${confirmed.length} dedup decisions...`)

  let archived = 0
  let aliasInserted = 0
  let reviewsMoved = 0
  let favoritesMoved = 0
  let packPlacesMoved = 0
  let skipped = 0

  for (const c of confirmed) {
    const keeper = c.keeper
    const loser = c.loser

    // Skip if loser already archived
    const { data: cur } = await supabase
      .from('places')
      .select('id, archived_at, slug')
      .eq('id', loser.id)
      .single()
    if (!cur || cur.archived_at) {
      skipped++
      continue
    }

    // Move reviews (place_reviews.place_id → keeper)
    const { data: revs } = await supabase
      .from('place_reviews')
      .update({ place_id: keeper.id })
      .eq('place_id', loser.id)
      .is('deleted_at', null)
      .select('id')
    reviewsMoved += revs?.length ?? 0

    // Move favorites (best-effort, ignore conflicts)
    try {
      const { data: favs } = await supabase
        .from('favorite_places')
        .update({ place_id: keeper.id })
        .eq('place_id', loser.id)
        .select('id')
      favoritesMoved += favs?.length ?? 0
    } catch (e) {
      // unique constraint conflict — favorite already exists for keeper; just delete loser's row
      await supabase.from('favorite_places').delete().eq('place_id', loser.id)
    }

    // Move pack_places (best-effort)
    try {
      const { data: pps } = await supabase
        .from('pack_places')
        .update({ place_id: keeper.id })
        .eq('place_id', loser.id)
        .select('id')
      packPlacesMoved += pps?.length ?? 0
    } catch (e) {
      await supabase.from('pack_places').delete().eq('place_id', loser.id)
    }

    // Insert slug alias for 301 redirect (upsert on old_slug primary key)
    const { error: aliasErr } = await supabase
      .from('place_slug_aliases')
      .upsert({ old_slug: loser.slug, place_id: keeper.id }, { onConflict: 'old_slug' })
    if (!aliasErr) aliasInserted++
    else console.warn(`alias upsert failed for ${loser.slug}: ${aliasErr.message}`)

    // Archive the loser
    const reason = `duplicate_of:${keeper.slug}`
    const { error: archErr } = await supabase
      .from('places')
      .update({
        archived_at: new Date().toISOString(),
        archived_reason: reason,
      })
      .eq('id', loser.id)
    if (archErr) {
      console.error(`archive failed for ${loser.slug}: ${archErr.message}`)
      continue
    }
    archived++
    if (archived % 20 === 0) console.log(`  archived ${archived}/${confirmed.length}`)
  }

  console.log('')
  console.log(`Archived: ${archived}`)
  console.log(`Already archived (skipped): ${skipped}`)
  console.log(`Aliases inserted: ${aliasInserted}`)
  console.log(`Reviews moved: ${reviewsMoved}`)
  console.log(`Favorites moved: ${favoritesMoved}`)
  console.log(`pack_places moved: ${packPlacesMoved}`)

  // Save run log
  fs.writeFileSync(
    path.join(process.cwd(), 'scripts', 'seo-out', 'duplicates-applied.json'),
    JSON.stringify(
      {
        ran_at: new Date().toISOString(),
        archived,
        skipped,
        aliasInserted,
        reviewsMoved,
        favoritesMoved,
        packPlacesMoved,
      },
      null,
      2
    )
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
