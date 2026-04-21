#!/usr/bin/env tsx
/**
 * Enrich the 7 UK recommendations seeded by scripts/seed-uk-recommendations.ts
 * with real addresses + websites + hero images found via follow-up web search.
 *
 * Idempotent. Only updates fields that we now have better data for.
 *
 * Usage:
 *   tsx scripts/enrich-uk-recommendations.ts           # dry-run
 *   tsx scripts/enrich-uk-recommendations.ts --commit  # persist
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

interface Enrichment {
  source_id: string
  address?: string
  postcode?: string
  geocode_query?: string  // re-geocode via exact address
  website?: string
  category_override?: 'eat' | 'hotel' | 'store' | 'organisation' | 'event'
  subcategory_override?: string
  scrape_url?: string    // page to extract og:image from
}

const UPDATES: Enrichment[] = [
  {
    source_id: 'haye-cornwall-liskeard',
    scrape_url: 'https://hayecornwall.co.uk/',
  },
  {
    // Per user: vegatintagel.co.uk wasn't resolving — do NOT attach website
    // or scrape an image from it. Leave image null until user provides one.
    source_id: 'vega-tintagel-tintagel',
  },
  {
    source_id: 'the-miggi-exeter',
    address: '7 Colin Road, Paignton, Devon TQ3 2NR, United Kingdom',
    postcode: 'TQ3 2NR',
    geocode_query: '7 Colin Road, Paignton, Devon, TQ3 2NR',
    website: 'https://miggi.co.uk/',
    category_override: 'hotel',
    subcategory_override: 'guesthouse',
    scrape_url: 'https://miggi.co.uk/',
  },
  {
    source_id: 'the-base-vegan-retreat-bristol',
    scrape_url: 'https://www.thebaseretreat.co.uk/',
  },
  {
    source_id: 'cosmic-kitchen-plymouth',
    address: 'Sir John Hawkins Square, Palace Street, Plymouth PL1 2AY, United Kingdom',
    postcode: 'PL1 2AY',
    geocode_query: 'Palace Street, Plymouth, PL1 2AY',
    website: 'https://cosmickitchen.co.uk/',
    scrape_url: 'https://cosmickitchen.co.uk/',
  },
  {
    source_id: 'sunshine-cafe-and-yoga-penryn',
    address: 'The JP Building, Hill Head, Penryn, Cornwall TR10 8JU, United Kingdom',
    postcode: 'TR10 8JU',
    geocode_query: 'Hill Head, Penryn, TR10 8JU',
    website: 'https://www.sunshinecafeandyoga.co/',
    scrape_url: 'https://www.sunshinecafeandyoga.co/',
  },
  {
    source_id: 'dil-s-cafe-falmouth',
    address: '19c Well Lane, Falmouth, Cornwall TR11 3DJ, United Kingdom',
    postcode: 'TR11 3DJ',
    geocode_query: '19 Well Lane, Falmouth, TR11 3DJ',
  },
]

async function geocode(query: string): Promise<{ lat: number; lng: number; display_name: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=gb`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PlantsPack/1.0 (hello@plantspack.com) enrich-uk-recommendations', 'Accept': 'application/json' },
  })
  if (!res.ok) return null
  const data = await res.json() as any[]
  return data?.[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display_name: data[0].display_name } : null
}

/** Scrape a page for the best hero image: og:image → twitter:image → first large <img>. */
async function scrapeHeroImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PlantsPackBot/1.0; +https://plantspack.com/bot)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      // 10s cap — we have 7 of these to run
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const html = await res.text()
    // Prefer og:image (absolute URL in canonical sites).
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    if (og?.[1]) return new URL(og[1], url).toString()
    const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
    if (tw?.[1]) return new URL(tw[1], url).toString()
    // Fallback: first <img> whose src suggests a hero (hero, banner, slider, slide, main)
    const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
    const heroLike = imgs.find(m => /hero|banner|slider|slide|cover|main/i.test(m[1]))
    if (heroLike?.[1]) return new URL(heroLike[1], url).toString()
    // Else first img
    if (imgs[0]?.[1]) return new URL(imgs[0][1], url).toString()
    return null
  } catch {
    return null
  }
}

async function main() {
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY-RUN'} · ${UPDATES.length} places\n`)

  let ok = 0, failed = 0

  for (const u of UPDATES) {
    console.log(`  [${u.source_id}]`)

    const { data: place } = await supabase
      .from('places')
      .select('id, name, city, country, slug, address, latitude, longitude, main_image_url, images, website, category, subcategory')
      .eq('source', SOURCE_TAG)
      .eq('source_id', u.source_id)
      .maybeSingle()
    if (!place) {
      console.log(`    ⚠ not found — skipping`)
      failed++
      continue
    }

    const patch: Record<string, any> = {}

    if (u.geocode_query) {
      const g = await geocode(u.geocode_query)
      if (g) {
        console.log(`    ✓ re-geocoded → ${g.lat.toFixed(4)}, ${g.lng.toFixed(4)}`)
        patch.latitude = g.lat
        patch.longitude = g.lng
        patch.address = u.address || g.display_name
      } else {
        console.log(`    ⚠ re-geocode failed; keeping coords, updating address only`)
        if (u.address) patch.address = u.address
      }
      await new Promise(r => setTimeout(r, 1100))  // Nominatim etiquette
    } else if (u.address && place.address !== u.address) {
      patch.address = u.address
    }

    if (u.website && !place.website) patch.website = u.website
    if (u.category_override && place.category !== u.category_override) patch.category = u.category_override
    if (u.subcategory_override && place.subcategory !== u.subcategory_override) patch.subcategory = u.subcategory_override

    if (u.scrape_url && !place.main_image_url) {
      const heroUrl = await scrapeHeroImage(u.scrape_url)
      if (heroUrl) {
        console.log(`    🖼  hero image → ${heroUrl.slice(0, 90)}`)
        patch.main_image_url = heroUrl
        patch.images = Array.from(new Set([heroUrl, ...(place.images || [])])).slice(0, 8)
      } else {
        console.log(`    ⚠ no hero image found at ${u.scrape_url}`)
      }
    }

    if (Object.keys(patch).length === 0) {
      console.log(`    ↻ nothing to update`)
      ok++
      continue
    }

    console.log(`    patch keys: ${Object.keys(patch).join(', ')}`)
    if (!commit) continue

    const { error } = await supabase.from('places').update(patch).eq('id', place.id)
    if (error) {
      console.log(`    ✗ ${error.message}`)
      failed++
    } else {
      console.log(`    ✓ updated`)
      ok++
    }
  }

  console.log(`\n=== DONE === { updated: ${ok}, failed: ${failed} }`)
  if (!commit) console.log('\n(dry-run — rerun with --commit to persist)')
}

main().catch(e => { console.error(e); process.exit(1) })
