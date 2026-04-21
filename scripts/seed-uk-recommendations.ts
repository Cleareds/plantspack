#!/usr/bin/env tsx
/**
 * Seed user-recommended UK places (Cornwall / Devon / Somerset / Bristol).
 * Idempotent on source_id so running twice doesn't duplicate.
 *
 * Flow per place:
 * 1. Reverse-geocode name + city via Nominatim (polite headers, 1 req/s).
 * 2. Insert into places with verification_status='pending' + source tag so
 *    they show up in the admin queue for human review before becoming
 *    visible on the directory.
 * 3. Skip any rows where geocoding returned no hit — they'll be logged so
 *    the admin can hand-enter coords.
 *
 * Usage:
 *   tsx scripts/seed-uk-recommendations.ts           # dry-run
 *   tsx scripts/seed-uk-recommendations.ts --commit  # insert
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SOURCE_TAG = 'manual-user-recommended-2026-04-21'
const commit = process.argv.includes('--commit')

interface Recommendation {
  name: string
  city: string
  county?: string
  country: string
  category: 'eat' | 'hotel' | 'store' | 'organisation' | 'event'
  subcategory?: string
  vegan_level: 'fully_vegan' | 'vegan_friendly'
  website?: string
  phone?: string
  description: string
  nominatim_query: string  // precise string for geocoding
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    name: 'Haye Cornwall',
    city: 'Liskeard',
    county: 'Cornwall',
    country: 'United Kingdom',
    category: 'organisation',
    subcategory: 'sanctuary',
    vegan_level: 'fully_vegan',
    website: 'https://hayecornwall.co.uk/',
    phone: '+44 7930 181174',
    description: 'Animal sanctuary and retreat centre near Liskeard. Offers on-site vegan holiday stays and transformative wellness retreats; all profits go to the rescued donkeys, ponies, chickens and pigs who live at the sanctuary.',
    nominatim_query: 'Haye Cornwall, Liskeard',
  },
  {
    name: 'Vega Tintagel',
    city: 'Tintagel',
    county: 'Cornwall',
    country: 'United Kingdom',
    category: 'eat',
    subcategory: 'cafe',
    vegan_level: 'fully_vegan',
    description: 'Fully-vegan café in Tintagel, Cornwall.',
    nominatim_query: 'Vega Tintagel, Tintagel, Cornwall',
  },
  {
    // User gave only "The Miggi in Devon" — best-effort county centroid
    // until admin supplies a specific town during /admin/staging triage.
    name: 'The Miggi',
    city: 'Exeter',
    county: 'Devon',
    country: 'United Kingdom',
    category: 'eat',
    vegan_level: 'vegan_friendly',
    description: 'Vegan-friendly spot in Devon (exact location pending admin review).',
    nominatim_query: 'The Miggi, Devon, UK',
  },
  {
    name: 'The Base Vegan Retreat',
    city: 'Bristol',
    county: 'England',
    country: 'United Kingdom',
    category: 'hotel',
    subcategory: 'retreat',
    vegan_level: 'fully_vegan',
    website: 'https://www.thebaseretreat.co.uk/',
    phone: '+44 7932 728606',
    description: 'Luxury fully-vegan retreat and animal sanctuary in Hanham, Bristol. Bespoke cabin with views over the Cotswolds, outdoor spa area, cooked vegan breakfast; accommodation funds the not-for-profit sanctuary.',
    nominatim_query: 'Hanham, Bristol, BS15 9NW',
  },
  {
    name: 'Cosmic Kitchen',
    city: 'Plymouth',
    county: 'Devon',
    country: 'United Kingdom',
    category: 'eat',
    subcategory: 'cafe',
    vegan_level: 'fully_vegan',
    website: 'https://www.facebook.com/cosmickitchenplymouth',
    description: 'Vegan café in Plymouth (details pending admin review).',
    nominatim_query: 'Cosmic Kitchen, Plymouth',
  },
  {
    name: 'Sunshine Cafe and Yoga',
    city: 'Penryn',
    county: 'Cornwall',
    country: 'United Kingdom',
    category: 'eat',
    subcategory: 'cafe',
    vegan_level: 'vegan_friendly',
    website: 'https://www.facebook.com/sunshinecafeandyoga',
    description: 'Vegan-friendly café with on-site yoga in Penryn, Cornwall.',
    nominatim_query: 'Sunshine Cafe and Yoga, Penryn',
  },
  {
    name: "Dil's Cafe",
    city: 'Falmouth',
    county: 'Cornwall',
    country: 'United Kingdom',
    category: 'eat',
    subcategory: 'cafe',
    vegan_level: 'vegan_friendly',
    website: 'https://www.facebook.com/Dillsfalmouth',
    description: 'Vegan-friendly café in Falmouth, Cornwall.',
    nominatim_query: "Dil's Cafe, Falmouth, Cornwall",
  },
]

async function geocodeOnce(query: string): Promise<{ lat: number; lng: number; display_name: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=gb`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'PlantsPack/1.0 (hello@plantspack.com) seed-uk-recommendations',
      'Accept': 'application/json',
    },
  })
  if (!res.ok) return null
  const data = await res.json() as any[]
  if (!data?.length) return null
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    display_name: data[0].display_name,
  }
}

/** Try the exact query first; if no hit, fall back to just the city — so at
 *  least the place has real city-centre coords and shows up in the right city. */
async function geocodeWithFallback(exact: string, fallbackCity: string): Promise<{ lat: number; lng: number; display_name: string; fuzzy: boolean } | null> {
  const a = await geocodeOnce(exact)
  if (a) return { ...a, fuzzy: false }
  await new Promise(r => setTimeout(r, 1100))
  const b = await geocodeOnce(fallbackCity)
  if (b) return { ...b, fuzzy: true }
  return null
}

function slugify(name: string, city: string): string {
  return (`${name}-${city}`)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

async function findAdminId(): Promise<string> {
  const { data } = await supabase.from('users').select('id').eq('role', 'admin').limit(1).single()
  if (!data) throw new Error('No admin user found')
  return data.id
}

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'} · ${RECOMMENDATIONS.length} places\n`)

  const adminId = await findAdminId()
  console.log(`Inserting as admin: ${adminId}\n`)

  let ok = 0, skipped = 0, failed = 0

  for (const rec of RECOMMENDATIONS) {
    const sourceId = slugify(rec.name, rec.city)
    console.log(`  [${rec.name}] ${rec.city} · source_id=${sourceId}`)

    // Check for existing
    const { data: existing } = await supabase
      .from('places')
      .select('id, slug')
      .eq('source', SOURCE_TAG)
      .eq('source_id', sourceId)
      .maybeSingle()
    if (existing) {
      console.log(`    ↻ already present (id=${existing.id}, slug=${existing.slug}) — skipping`)
      skipped++
      continue
    }

    // Geocode (exact, then city fallback)
    // Add county to the fallback so "Plymouth" doesn't match "Plymouth Road, Totnes" etc.
  const fallbackQuery = [rec.city, rec.county, 'UK'].filter(Boolean).join(', ')
    const geo = await geocodeWithFallback(rec.nominatim_query, fallbackQuery)
    if (!geo) {
      console.log(`    ⚠ geocode miss for "${rec.nominatim_query}" AND "${fallbackQuery}" — skipping`)
      failed++
      continue
    }
    const label = geo.fuzzy ? 'city-fallback' : 'exact'
    console.log(`    ✓ geocoded (${label}) → ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)} (${geo.display_name.slice(0, 70)})`)

    if (!commit) continue

    const { error } = await supabase.from('places').insert({
      name: rec.name,
      description: rec.description,
      category: rec.category,
      subcategory: rec.subcategory ?? null,
      latitude: geo.lat,
      longitude: geo.lng,
      address: geo.display_name,
      website: rec.website ?? null,
      phone: rec.phone ?? null,
      city: rec.city,
      country: rec.country,
      vegan_level: rec.vegan_level,
      verification_status: 'pending',
      source: SOURCE_TAG,
      source_id: sourceId,
      slug: slugify(rec.name, rec.city),
      created_by: adminId,
      tags: ['user_recommended', `county:${rec.county || 'unknown'}`],
    })
    if (error) {
      console.log(`    ✗ insert error: ${error.message}`)
      failed++
    } else {
      ok++
    }

    // Nominatim etiquette: 1 req/s max
    await new Promise(r => setTimeout(r, 1100))
  }

  console.log(`\n=== DONE ===`)
  console.log({ inserted: ok, skipped, failed, source: SOURCE_TAG })
  if (!commit) console.log('\n(dry-run — rerun with --commit to insert)')
}

main().catch(e => { console.error(e); process.exit(1) })
