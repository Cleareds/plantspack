/**
 * Auto-enrich place descriptions for rows that have none.
 *
 * Google's "Crawled – currently not indexed" bucket is 68 pages; most are
 * places with no descriptive text at all, just name + address. Writing a
 * short factual paragraph from the structured fields we already display
 * gives Google indexable text without inventing anything.
 *
 * Rules (approved by project owner):
 *   - Factual restatements ONLY. No marketing prose, no adjectives we can't
 *     justify from the data, no invented claims.
 *   - Every sentence is derived from a field we'd already render on the
 *     place page. If the field is null, that sentence is skipped.
 *   - Script is idempotent: writes only to rows with NULL description.
 *
 * USAGE:
 *   tsx scripts/enrich-thin-places.ts --dry-run     # print plan, no writes
 *   tsx scripts/enrich-thin-places.ts --commit      # actually update rows
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const CATEGORY_NOUN: Record<string, string> = {
  eat: 'restaurant',
  store: 'store',
  hotel: 'stay',
  organisation: 'animal sanctuary',
  event: 'vegan event',
}

interface PlaceRow {
  id: string
  name: string
  category: string | null
  vegan_level: string | null
  city: string | null
  country: string | null
  address: string | null
  cuisine_types: string[] | null
  website: string | null
  phone: string | null
  subcategory: string | null
  is_pet_friendly: boolean | null
}

function generateDescription(p: PlaceRow): string | null {
  const sentences: string[] = []

  // Sentence 1: "{Name} is a fully-vegan restaurant in Berlin, Germany."
  const noun = CATEGORY_NOUN[p.category || ''] || 'place'
  const veganQualifier =
    p.vegan_level === 'fully_vegan' ? 'fully-vegan'
    : p.vegan_level === 'vegan_friendly' ? 'vegan-friendly'
    : null
  const locationParts = [p.city, p.country].filter(Boolean).join(', ')
  if (veganQualifier && locationParts) {
    sentences.push(`${p.name} is a ${veganQualifier} ${noun} in ${locationParts}.`)
  } else if (locationParts) {
    sentences.push(`${p.name} is a vegan ${noun} in ${locationParts}.`)
  } else if (veganQualifier) {
    sentences.push(`${p.name} is a ${veganQualifier} ${noun}.`)
  }

  // Sentence 2: cuisine types
  if (p.cuisine_types && p.cuisine_types.length > 0) {
    const cuisines = p.cuisine_types
      .filter(c => c && c !== 'vegan')
      .slice(0, 4)
    if (cuisines.length > 0) {
      sentences.push(`The menu features ${cuisines.join(', ')} cuisine.`)
    }
  }

  // Sentence 3: subcategory (e.g. bakery, cafe)
  if (p.subcategory && p.subcategory !== 'general') {
    sentences.push(`It's a ${p.subcategory.replace(/_/g, ' ')}.`)
  }

  // Sentence 4: pet-friendly
  if (p.is_pet_friendly) {
    sentences.push('Pet-friendly.')
  }

  // Sentence 5: website
  if (p.website) {
    try {
      const host = new URL(p.website.startsWith('http') ? p.website : `https://${p.website}`).hostname.replace(/^www\./, '')
      sentences.push(`More details at ${host}.`)
    } catch {}
  }

  if (sentences.length === 0) return null
  return sentences.join(' ')
}

async function main() {
  const DRY_RUN = process.argv.includes('--dry-run') || !process.argv.includes('--commit')

  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (writing descriptions)'}`)

  const { data, error } = await sb
    .from('places')
    .select('id, name, category, vegan_level, city, country, address, cuisine_types, website, phone, subcategory, is_pet_friendly')
    .is('archived_at', null)
    .is('description', null)

  if (error) {
    console.error('Query failed:', error)
    process.exit(1)
  }

  console.log(`Found ${data?.length || 0} places with NULL description`)

  let willWrite = 0
  let skipped = 0
  let written = 0
  for (const p of (data || []) as PlaceRow[]) {
    const desc = generateDescription(p)
    if (!desc) {
      skipped++
      continue
    }
    willWrite++
    if (willWrite <= 5) {
      console.log(`\n${p.name} (${p.city || '?'}, ${p.country || '?'})`)
      console.log(`  → ${desc}`)
    }

    if (!DRY_RUN) {
      const { error: upErr } = await sb.from('places').update({ description: desc }).eq('id', p.id)
      if (upErr) console.error(`  FAILED on ${p.id}:`, upErr.message)
      else written++
    }
  }

  console.log(`\nDone.`)
  console.log(`  ${DRY_RUN ? 'Would write' : 'Wrote'}: ${DRY_RUN ? willWrite : written}`)
  console.log(`  Skipped (insufficient data): ${skipped}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
