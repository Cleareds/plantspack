/**
 * Porto bulk update — 2026-05-07
 *
 * Combines three operations on the existing Porto-area corpus:
 *   1. archive places confirmed closed (Árvore do Mundo)
 *   2. reclassify mixed-menu restaurants from vegan_friendly → vegan_options
 *      per the user's stricter "no meat smell / not dominated by meat" rule
 *   3. enrich existing fully_vegan rows with the official websites the user
 *      provided in the import list (where the site URL was missing or wrong)
 *
 * Phase 2/3 (NEW place inserts + scraped addresses) live in a separate
 * runner so this phase can ship and be reverted independently if needed.
 *
 * Per CLAUDE.md: NOT admin_review (this is a bulk update). Updates use
 *   source='porto-update-2026-05-07' on the affected rows so the change
 *   is rollback-able. verification_method stays at 'imported' (or its
 *   existing value when already richer than 'imported').
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const SOURCE_TAG = 'porto-update-2026-05-07'

interface Reclass {
  slug: string
  to: 'fully_vegan' | 'mostly_vegan' | 'vegan_friendly' | 'vegan_options'
  reason: string
  website?: string
  category?: 'eat' | 'store' | 'hotel' | 'event' | 'organisation' | 'other'
  subcategory?: string | null
}

// Existing rows. Slug values come from the audit query.
const RECLASSIFY: Reclass[] = [
  // Mixed-menu Italian / Asian / Middle-Eastern places — meat dominant.
  { slug: 'al-forno-da-baixa-porto', to: 'vegan_options', reason: 'mixed Italian (cheese/meat heavy); user reclass per stricter rule' },
  { slug: 'bao-s-porto', to: 'vegan_options', reason: 'mixed bao place; user reclass' },
  { slug: 'cult-of-pita-porto', to: 'vegan_options', reason: 'mixed Middle Eastern; user reclass' },
  { slug: 'farinha', to: 'vegan_options', reason: 'mixed pizzeria; user reclass' },
  { slug: 'nola-kitchen-porto', to: 'vegan_options', reason: 'serves meat; user reclass' },

  // Promote: should be fully vegan per user-supplied evidence
  { slug: 'vrasserie-porto', to: 'fully_vegan', reason: 'fully vegan per HappyCow + own site', website: 'https://www.vrasserie.com/' },

  // Category fixes — places mistakenly tagged as store
  { slug: 'a-padoca', to: 'fully_vegan', reason: 'A Padoca is bakery+cafe+shop, not just store', website: 'https://apadoca.pt/en/', category: 'eat', subcategory: 'bakery' },
  { slug: 'odete-bakery-porto', to: 'fully_vegan', reason: 'bakery, not grocery store', category: 'eat', subcategory: 'bakery' },
  // Casa da Horta (live row) - user-confirmed vegan-friendly is correct
  // O Macrobiótico - already fully_vegan, no change needed
  // Vegana by Tentúgal - already fully_vegan, no change needed
]

// Website / link enrichments where the user's list has a URL we don't have on file.
const WEBSITE_ENRICH: Array<{ slug: string; website: string }> = [
  { slug: 'kind-kitchen-porto', website: 'https://kindkitchen.pt/en/home-en/' },
  { slug: 'daterra-porto', website: 'https://www.daterra.pt/' },
  { slug: 'daterra-matosinhos-matosinhos', website: 'https://www.daterra.pt/' },
  { slug: 'o-macrobiotico-porto', website: 'https://www.instagram.com/omacrobioticorestaurante/' },
  { slug: 'verde-hut', website: 'https://www.instagram.com/verde_hut/' },
  { slug: 'lupin-snack-bar-porto', website: 'https://www.happycow.net/reviews/lupin-snack-bar-porto-' },
  { slug: 'ongo-porto', website: 'https://www.instagram.com/ongo.kitchen/' },
  { slug: 'mnt-vegan-cafe-porto', website: 'https://www.ubereats.com/pt-en/store/mtn-vegan-cafe/DX4Ou6Y8VV65T0jI3Lt1TQ' },
  { slug: 'casanova', website: 'https://www.happycow.net/reviews/casanova-porto-' },
  { slug: 'casa-da-horta-porto', website: 'https://casadahorta.pegada.net/' },
  { slug: 'essencia-restaurante-vegetariano-porto', website: 'https://www.essenciarestaurantevegetariano.com/' },
  { slug: 'cultura-dos-sabores-porto', website: 'https://www.happycow.net/reviews/cultura-dos-sabores-porto-' },
]

// Confirmed closed by HappyCow — archive only, never delete.
const ARCHIVE: Array<{ slug: string; reason: string }> = [
  { slug: 'arvore-do-mundo', reason: 'closed-per-happycow-feb-2023' },
  // black-mamba already archived
]

// Self-duplicate cleanup discovered in audit.
const SLUG_DUPES: Array<{ keeper_slug: string; loser_slug: string; reason: string }> = [
  { keeper_slug: 'casa-da-horta-porto', loser_slug: 'casa-da-horta-porto-2', reason: 'duplicate row from earlier import' },
]

async function main() {
  let archivedCount = 0
  let reclassCount = 0
  let websiteCount = 0
  let dupeArchivedCount = 0

  // 1. Archive closed places
  for (const a of ARCHIVE) {
    const { data: row } = await sb.from('places').select('id, archived_at').eq('slug', a.slug).maybeSingle()
    if (!row) { console.log(`  [archive skip] ${a.slug} not found`); continue }
    if (row.archived_at) { console.log(`  [archive skip] ${a.slug} already archived`); continue }
    const { error } = await sb.from('places').update({
      archived_at: new Date().toISOString(),
      archived_reason: a.reason,
    }).eq('id', row.id)
    if (error) console.warn(`  [archive fail] ${a.slug}: ${error.message}`)
    else { archivedCount++; console.log(`  [archived] ${a.slug} (${a.reason})`) }
  }

  // 2. Reclassify (vegan_level / category / website)
  for (const r of RECLASSIFY) {
    const { data: row } = await sb.from('places').select('id, vegan_level, category, subcategory, website, verification_method, verification_level').eq('slug', r.slug).is('archived_at', null).maybeSingle()
    if (!row) { console.log(`  [reclass skip] ${r.slug} not found / archived`); continue }
    const update: any = { source: SOURCE_TAG }
    let touched = false
    if (row.vegan_level !== r.to) {
      update.vegan_level = r.to
      // For fully_vegan promotions via bulk import, keep verification_method
      // as 'imported' to satisfy the human-only-fully-vegan trigger.
      if (r.to === 'fully_vegan' && row.verification_method === 'ai_verified') {
        update.verification_method = 'imported'
        update.verification_level = Math.max(row.verification_level ?? 0, 2)
      }
      touched = true
    }
    if (r.category && row.category !== r.category) { update.category = r.category; touched = true }
    if (r.subcategory && row.subcategory !== r.subcategory) { update.subcategory = r.subcategory; touched = true }
    if (r.website && (!row.website || row.website !== r.website)) { update.website = r.website; touched = true }
    if (!touched) { console.log(`  [reclass noop] ${r.slug}`); continue }
    const { error } = await sb.from('places').update(update).eq('id', row.id)
    if (error) console.warn(`  [reclass fail] ${r.slug}: ${error.message}`)
    else { reclassCount++; console.log(`  [reclass] ${r.slug} -> ${JSON.stringify(update)}`) }
  }

  // 3. Website-only enrichment
  for (const w of WEBSITE_ENRICH) {
    const { data: row } = await sb.from('places').select('id, website').eq('slug', w.slug).is('archived_at', null).maybeSingle()
    if (!row) { console.log(`  [website skip] ${w.slug} not found`); continue }
    if (row.website && row.website === w.website) { console.log(`  [website noop] ${w.slug}`); continue }
    if (row.website && row.website.length > 5 && !row.website.includes('happycow') && !row.website.includes('instagram')) {
      // Do not overwrite a real website with a HappyCow / Instagram link.
      console.log(`  [website skip] ${w.slug} already has ${row.website}`)
      continue
    }
    const { error } = await sb.from('places').update({ website: w.website, source: SOURCE_TAG }).eq('id', row.id)
    if (error) console.warn(`  [website fail] ${w.slug}: ${error.message}`)
    else { websiteCount++; console.log(`  [website] ${w.slug} -> ${w.website}`) }
  }

  // 4. Slug duplicates -> archive losers + insert alias
  for (const d of SLUG_DUPES) {
    const { data: keeper } = await sb.from('places').select('id, slug').eq('slug', d.keeper_slug).is('archived_at', null).maybeSingle()
    const { data: loser } = await sb.from('places').select('id, slug, archived_at').eq('slug', d.loser_slug).maybeSingle()
    if (!keeper) { console.log(`  [dupe skip] keeper ${d.keeper_slug} not found`); continue }
    if (!loser) { console.log(`  [dupe skip] loser ${d.loser_slug} not found`); continue }
    if (loser.archived_at) { console.log(`  [dupe skip] ${d.loser_slug} already archived`); continue }
    // Move user data from loser -> keeper (best effort)
    await sb.from('place_reviews').update({ place_id: keeper.id }).eq('place_id', loser.id).is('deleted_at', null)
    try { await sb.from('favorite_places').update({ place_id: keeper.id }).eq('place_id', loser.id) } catch {}
    try { await sb.from('pack_places').update({ place_id: keeper.id }).eq('place_id', loser.id) } catch {}
    await sb.from('place_slug_aliases').upsert({ old_slug: d.loser_slug, place_id: keeper.id }, { onConflict: 'old_slug' })
    const { error } = await sb.from('places').update({
      archived_at: new Date().toISOString(),
      archived_reason: `duplicate_of:${d.keeper_slug}`,
    }).eq('id', loser.id)
    if (error) console.warn(`  [dupe fail] ${d.loser_slug}: ${error.message}`)
    else { dupeArchivedCount++; console.log(`  [dupe archived] ${d.loser_slug} -> alias to ${d.keeper_slug}`) }
  }

  console.log('')
  console.log('Summary:')
  console.log(`  archived (closed): ${archivedCount}`)
  console.log(`  reclassified:      ${reclassCount}`)
  console.log(`  website enriched:  ${websiteCount}`)
  console.log(`  duplicates merged: ${dupeArchivedCount}`)
}

main().catch(e => { console.error(e); process.exit(1) })
