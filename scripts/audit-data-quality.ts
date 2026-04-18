#!/usr/bin/env tsx
/**
 * Audits the places table against the shared matching/categorize lib and
 * populates the admin data-quality tabs with real review queues:
 *
 *   1. Chain candidates → tag 'chain-candidate' on any row whose normalized
 *      name matches `isChainName`.
 *
 *   2. Suspected wrong category → set categorization_note='default:eat' on
 *      rows with `category='eat'` whose name clearly suggests a non-eat
 *      category (store/hotel/event/organisation per detectCategory). These
 *      show up in the admin "Wrong Category" tab for reclassification.
 *
 *   3. Categorization_note backfill → every place without a note gets one
 *      based on its current name + tags, so admin can see why each row has
 *      the category it does.
 *
 * This is READ-MOSTLY: only sets tags + categorization_note. Never changes
 * `category`, `vegan_level`, or archives. Safe to run repeatedly.
 *
 * Usage:
 *   tsx scripts/audit-data-quality.ts              # dry-run report
 *   tsx scripts/audit-data-quality.ts --commit     # persist tags + notes
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { isChainName } from '../src/lib/places/matching'
import { detectCategory } from '../src/lib/places/categorize'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const commit = process.argv.includes('--commit')

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'}`)

  const PAGE = 1000
  let off = 0
  const stats = {
    reviewed: 0,
    newChainCandidates: 0,
    existingChainCandidates: 0,
    newWrongCategory: 0,
    existingWrongCategory: 0,
    backfilledNote: 0,
  }

  while (true) {
    const { data, error } = await supabase
      .from('places')
      .select('id, name, category, tags, cuisine_types, foursquare_data, categorization_note, archived_at')
      .is('archived_at', null)
      .order('id', { ascending: true })
      .range(off, off + PAGE - 1)
    if (error) { console.error(error); process.exit(1) }
    if (!data || data.length === 0) break

    for (const p of data) {
      stats.reviewed++
      const tags: string[] = p.tags || []
      const name = p.name || ''
      let updates: Record<string, unknown> = {}
      let newTags: string[] | null = null

      // --- 1. Chain candidate ---
      const chainHit = isChainName(name)
      const hasChainTag = tags.includes('chain-candidate')
      if (chainHit && !hasChainTag) {
        newTags = [...tags, 'chain-candidate']
        stats.newChainCandidates++
      } else if (chainHit) {
        stats.existingChainCandidates++
      }

      // --- 2. Category hint via lib ---
      const fsqCats = (p.foursquare_data as any)?.categories
      const fsqCategoryNames: string[] = Array.isArray(fsqCats) ? fsqCats.map((c: any) => c.name).filter(Boolean) : []
      const hints = {
        name,
        fsqCategoryNames,
        cuisineTags: Array.isArray(p.cuisine_types) ? p.cuisine_types : [],
      }
      const detected = detectCategory(hints)

      // Flag as wrong-category if: currently 'eat', but detector is confident
      // in a different category (hotel/store/event/organisation).
      const shouldFlag =
        p.category === 'eat' &&
        detected.confidence >= 0.6 &&
        detected.category !== 'eat' &&
        detected.category !== 'other'

      // Only write categorization_note for ACTIONABLE cases (flagged wrong
      // category). Skipping benign backfills keeps this script fast — the
      // note is an admin-review signal, not a general-purpose label.
      if (shouldFlag) {
        const desiredNote = `default:eat;suggest:${detected.category}:${detected.note}`
        if (p.categorization_note !== desiredNote) {
          updates.categorization_note = desiredNote
          if (p.categorization_note?.startsWith('default:eat;suggest:')) stats.existingWrongCategory++
          else stats.newWrongCategory++
        }
      }

      if (newTags) updates.tags = newTags

      if (Object.keys(updates).length > 0 && commit) {
        const { error: uerr } = await supabase.from('places').update(updates).eq('id', p.id)
        if (uerr) console.error(`  err ${p.id}: ${uerr.message}`)
      }
    }
    off += data.length
    if (off % 5000 === 0) console.log(`  ${off} reviewed, chainNew=${stats.newChainCandidates}, wrongCatNew=${stats.newWrongCategory}`)
    if (data.length < PAGE) break
  }

  console.log('\n=== SUMMARY ===')
  console.log(stats)
  if (!commit) console.log('(dry-run — rerun with --commit to persist)')
}

main().catch(e => { console.error(e); process.exit(1) })
