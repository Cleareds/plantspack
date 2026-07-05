#!/usr/bin/env tsx
/**
 * Reusable "add a vegan place to PlantsPack" CLI.
 *
 * Reads a JSON payload on stdin describing a place, auto-fills the gaps
 * (geocode via Nominatim, scrape hero image from the website's og:image /
 * twitter:image / first non-logo <img>, generate slug), de-dupes by
 * (source, source_id), and inserts with verification_status='approved'
 * (use --pending to insert as pending instead).
 *
 * Designed to be called by the /add-place skill after Claude has already
 * done the WebFetch/WebSearch work to extract place data. That way the
 * mechanical parts live here and stay consistent across every add.
 *
 * Usage:
 *   cat payload.json | tsx scripts/add-place.ts [--pending] [--dry-run]
 *   echo '{"name":"...","city":"...",...}' | tsx scripts/add-place.ts
 *
 * Required payload fields:
 *   name, city, country, category, vegan_level
 *
 * Optional (script fills the gaps):
 *   description, subcategory, address, latitude, longitude, website,
 *   phone, email, main_image_url, images, opening_hours, tags,
 *   source (default: manual-<today>), source_id (default: slug),
 *   geocode_query (override what's sent to Nominatim),
 *   country_code (default: gb).
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as readline from 'readline'
import { osmLookupByCoords, mergeOsmData } from './lib/place-pipeline'
import { normalizeCity } from './lib/normalize-city'
import { scrapeHeroImage } from './lib/hero-image'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const PENDING = args.has('--pending')
// --ai-verified marks the row as verification_level=2, method='ai_verified'
// (not 3/admin_review). Used by batch imports where the source is a curated
// CSV / external audit but Claude has not personally verified each one.
const AI_VERIFIED = args.has('--ai-verified')
// --imported marks the row as verification_level=2, method='imported'. Used
// by batch imports from vegan-first external sources (curated blogs,
// existing directories like VegGuide). The DB CHECK constraint on
// (vegan_level=fully_vegan, verification_method) forbids 'ai_verified' for
// FV rows but allows 'imported', so this is the right flag for blog-batch
// FV imports that should still land at level=2 (needs admin confirm).
const IMPORTED = args.has('--imported')

interface PlacePayload {
  name: string
  city: string
  country: string
  category: 'eat' | 'hotel' | 'store' | 'organisation' | 'event'
  vegan_level: 'fully_vegan' | 'mostly_vegan' | 'vegan_friendly' | 'vegan_options'
  description?: string
  subcategory?: string
  address?: string
  latitude?: number
  longitude?: number
  website?: string
  phone?: string
  email?: string
  main_image_url?: string | null
  images?: string[]
  opening_hours?: Record<string, string> | null
  tags?: string[]
  source?: string
  source_id?: string
  geocode_query?: string
  country_code?: string  // ISO-3166-1 alpha-2 for Nominatim countrycodes= filter
  slug?: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return ''
  const rl = readline.createInterface({ input: process.stdin, terminal: false })
  const lines: string[] = []
  for await (const line of rl) lines.push(line)
  return lines.join('\n')
}

async function nominatim(query: string, countryCode = 'gb'): Promise<{ lat: number; lng: number; display_name: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=${countryCode}&addressdetails=1`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PlantsPack/1.0 (hello@plantspack.com) add-place CLI', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json() as any[]
    if (!data?.length) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display_name: data[0].display_name }
  } catch { return null }
}


async function findAdminId(): Promise<string> {
  const { data } = await supabase.from('users').select('id').eq('role', 'admin').limit(1).single()
  if (!data) throw new Error('No admin user found')
  return data.id
}

function summarize(payload: any) {
  const { name, city, country, category, vegan_level, website, latitude, longitude, main_image_url, address } = payload
  console.log('\n  Final payload:')
  console.log(`    name:       ${name}`)
  console.log(`    where:      ${city}, ${country}`)
  console.log(`    category:   ${category}${payload.subcategory ? ` / ${payload.subcategory}` : ''}`)
  console.log(`    vegan:      ${vegan_level}`)
  console.log(`    website:    ${website || '(none)'}`)
  console.log(`    coords:     ${latitude ?? '?'}, ${longitude ?? '?'}`)
  console.log(`    address:    ${(address || '(none)').slice(0, 100)}`)
  console.log(`    hero image: ${main_image_url ? main_image_url.slice(0, 100) : '(none)'}`)
}

async function main() {
  const raw = await readStdin()
  if (!raw) {
    console.error('Error: expected JSON on stdin.\nUsage: cat payload.json | tsx scripts/add-place.ts [--pending] [--dry-run]')
    process.exit(2)
  }

  let input: PlacePayload
  try { input = JSON.parse(raw) } catch (e: any) {
    console.error(`Error: invalid JSON on stdin — ${e.message}`)
    process.exit(2)
  }

  const required = ['name', 'city', 'country', 'category', 'vegan_level'] as const
  const missing = required.filter(k => !(input as any)[k])
  if (missing.length) {
    console.error(`Error: missing required fields: ${missing.join(', ')}`)
    process.exit(2)
  }

  // Vegan-level sanity guard. mostly_vegan is a strict tier — it means
  // "place presents as vegan with specific named exceptions" (e.g. "all
  // mains vegan, one dessert uses honey"). Marketing words like
  // "plant-based" or "95% plant-based" almost always mean vegetarian
  // with dairy/eggs and should be vegan_friendly, not mostly_vegan.
  if (input.vegan_level === 'mostly_vegan') {
    const desc = (input.description || '').toLowerCase()
    const tags = (input.tags || []).map((t: string) => t.toLowerCase())
    // Strong "mostly vegan" signals: explicit dish-count breakdown,
    // explicit "100% vegan menu" / "fully vegan except", named exceptions.
    const positiveSignals = [
      /\ball mains? (?:are|is) vegan\b/,
      /\bfully vegan except\b/,
      /\b100% vegan (?:menu|kitchen)\b/,
      /\bmostly vegan\b/,
      /\beverything is vegan except\b/,
      /\bvegan with the exception\b/,
      /\b\d+% (?:of (?:the )?menu (?:is|are) vegan|of dishes are vegan)\b/,  // "95% of menu is vegan" (NOT "95% plant-based")
    ]
    const hasPositive = positiveSignals.some(re => re.test(desc))
    // Negative signals: "plant-based" alone (without "100%"), "vegetarian",
    // "can be made vegan on request" — these all suggest vegan_friendly.
    const negativeSignals = [
      /\bplant-based\b(?!.*100%)/,
      /\bplant-forward\b/,
      /\bcan be made vegan\b/,
      /\bvegetarian (?:restaurant|cafe|menu)(?!.*all (?:mains|dishes) (?:are|is) vegan)/,
      /\bdairy\b/,
      /\bcheese\b/,
      /\beggs?\b(?! ?free)/,
      /\bhoney\b/,
    ]
    const triggered = negativeSignals.filter(re => re.test(desc)).map(re => re.source)
    if (!hasPositive || triggered.length > 0) {
      console.warn(`\n⚠ vegan_level guard — '${input.name}' is tagged mostly_vegan but the description does not satisfy the strict definition.`)
      if (!hasPositive) {
        console.warn(`  Missing explicit signal. mostly_vegan needs language like "all mains are vegan", "fully vegan except for X", or "95% of the menu is vegan".`)
      }
      if (triggered.length > 0) {
        console.warn(`  Suspect phrases in description: ${triggered.join(', ')}`)
      }
      console.warn(`  Reminder: "plant-based", "plant-forward", or "vegetarian" alone usually = vegan_friendly, not mostly_vegan.`)
      console.warn(`  Pass --force-vegan-level to override this guard, otherwise downgrade to vegan_friendly.\n`)
      const forceFlag = process.argv.includes('--force-vegan-level')
      if (!forceFlag) {
        console.error(`Aborting. Either fix the description to include explicit vegan-with-named-exceptions language, or set vegan_level to "vegan_friendly", or pass --force-vegan-level if you are sure.`)
        process.exit(2)
      }
    }
  }
  // fully_vegan with no website at all is hard to verify — surface it
  // but don't block. The admin data-quality view flags these too.
  if (input.vegan_level === 'fully_vegan' && !input.website) {
    console.warn(`\n⚠ '${input.name}' tagged fully_vegan but has no website. Hard to verify; consider downgrading or adding a source URL. Continuing.\n`)
  }

  // Description / vegan_level consistency guard. If the place is NOT
  // tagged fully_vegan, the description must not claim it is. This
  // catches AI-generated descriptions that hallucinated "entirely
  // plant-based menu", "fully vegan", "100% vegan" for venues that just
  // have a few vegan options. Project policy: never lie about a place's
  // vegan status. The earlier OSM batch produced ~8 of these in Belgium
  // alone before this guard existed.
  if (input.vegan_level && input.vegan_level !== 'fully_vegan' && input.description) {
    const desc = input.description.toLowerCase()
    const fullyVeganClaims = [
      /\bentirely (?:plant-based|vegan)\b/,
      /\bfully (?:plant-based|vegan)(?:\s+(?:menu|kitchen|setting|restaurant|cafe))?\b/,
      /\b100% (?:plant-based|vegan)\b/,
      /\ball[- ]vegan\b/,
      /\bcompletely (?:plant-based|vegan)\b/,
      // "vegan menu" alone is a soft signal — only flag when not balanced
      // by "options" / "items" / "dishes" qualifier.
      /\b(?:plant-based|vegan) menu\b(?!.*\b(?:options?|items?|dishes?|selection|choices)\b)/,
    ]
    const hits = fullyVeganClaims.filter(re => re.test(desc)).map(re => re.source)
    if (hits.length > 0) {
      console.error(`\n✗ description contradicts vegan_level — '${input.name}' is tagged ${input.vegan_level} but the description claims it is fully vegan.`)
      console.error(`  Phrases that triggered the guard: ${hits.join(', ')}`)
      console.error(`  EITHER tag it as fully_vegan with strong evidence (HappyCow, Yelp "Vegan" category, etc.)`)
      console.error(`  OR rewrite the description to honestly reflect that this is a non-vegan place with vegan options/section.`)
      console.error(`  Pass --force-description to override after manual review.\n`)
      if (!process.argv.includes('--force-description')) process.exit(2)
    }
  }

  // Defaults + derived fields.
  const source = input.source || `manual-${todayIso()}`
  let source_id = input.source_id || slugify(`${input.name}-${input.city}`)
  let slug = input.slug || source_id

  // De-dupe by (source, source_id) - catches re-runs of the same manual add.
  const { data: existing } = await supabase
    .from('places')
    .select('id, slug')
    .eq('source', source)
    .eq('source_id', source_id)
    .maybeSingle()
  if (existing) {
    console.log(`↻ Already present (source=${source}, source_id=${source_id}) → ${existing.slug}`)
    return
  }

  // Geocode if coords missing.
  let latitude = input.latitude
  let longitude = input.longitude
  let address = input.address
  if ((latitude == null || longitude == null) && (input.geocode_query || address || input.city)) {
    const q = input.geocode_query || address || `${input.name}, ${input.city}, ${input.country}`
    const cc = (input.country_code || 'gb').toLowerCase()
    const geo = await nominatim(q, cc)
    if (geo) {
      console.log(`  geocoded (${cc}) → ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}`)
      latitude = latitude ?? geo.lat
      longitude = longitude ?? geo.lng
      if (!address) address = geo.display_name
    } else {
      // Second attempt: city-only fallback.
      const cityGeo = await nominatim(`${input.city}, ${input.country}`, cc)
      if (cityGeo) {
        console.log(`  ⚠ exact geocode missed — using city centroid for ${input.city}`)
        latitude = latitude ?? cityGeo.lat
        longitude = longitude ?? cityGeo.lng
      } else {
        console.log(`  ✗ geocode failed for "${q}" and "${input.city}"`)
      }
    }
  }

  // OSM cross-reference: find matching node, merge phone/hours/website/cuisine.
  if (latitude != null && longitude != null && !input.source_id?.startsWith('osm-')) {
    const osmEl = await osmLookupByCoords(latitude, longitude, input.name)
    if (osmEl) {
      const osmId = `osm-${osmEl.type}-${osmEl.id}`
      const merged = mergeOsmData(
        { phone: input.phone, website: input.website, opening_hours: input.opening_hours as any, cuisine_types: input.cuisine_types as any } as any,
        osmEl.tags,
        osmId,
      )
      if (merged.phone && !input.phone) { input.phone = merged.phone as string; console.log(`  OSM merged phone: ${input.phone}`) }
      if (merged.website && !input.website) { input.website = merged.website as string; console.log(`  OSM merged website: ${input.website}`) }
      if (merged.opening_hours && !input.opening_hours) { input.opening_hours = merged.opening_hours as any; console.log(`  OSM merged opening_hours`) }
      if (!input.source_id) { input.source_id = osmId; console.log(`  OSM source_id: ${osmId}`) }
      console.log(`  ✅ OSM match: ${osmEl.tags.name} (${osmId})`)

      // Cross-source dedup: a previous OSM import may already have this node.
      // Check by source_id alone (OSM ids are globally unique across `source`
      // values like 'osm-import-2026-04', 'osm-import-2026-03', etc.).
      const { data: osmDupe } = await supabase
        .from('places')
        .select('id, slug, source')
        .eq('source_id', osmId)
        .is('archived_at', null)
        .maybeSingle()
      if (osmDupe) {
        console.log(`↻ Already in DB via OSM import (source=${osmDupe.source}, source_id=${osmId}) → /place/${osmDupe.slug}`)
        console.log(`  Tip: edit at /admin/data-quality, or merge manually if details differ.`)
        return
      }
    }
  }

  // Scrape hero image if not provided but we have a website.
  let main_image_url = input.main_image_url ?? null
  if (!main_image_url && input.website) {
    main_image_url = await scrapeHeroImage(input.website)
    if (main_image_url) console.log(`  🖼  hero image scraped → ${main_image_url.slice(0, 90)}`)
    else console.log(`  ⚠ no hero image found on ${input.website}`)
  }

  const images = input.images && input.images.length ? input.images : (main_image_url ? [main_image_url] : [])
  const tags = Array.from(new Set([...(input.tags || []), 'user_recommended']))

  const payload = {
    name: input.name,
    description: input.description || null,
    category: input.category,
    subcategory: input.subcategory || null,
    latitude,
    longitude,
    address: address || null,
    website: input.website || null,
    phone: input.phone || null,
    city: normalizeCity(input.city, input.country) || input.city,
    country: input.country,
    vegan_level: input.vegan_level,
    verification_status: PENDING ? 'pending' : 'approved',
    // is_verified=true is reserved for genuine community/admin confirmation
    // taken through the data-quality page or place page UI. CLI runs never
    // claim that signal; they set verification_level + verification_method
    // honestly and leave is_verified=false so the footer doesn't fake a
    // green "Confirmed" badge.
    is_verified: false,
    // verification_level: PENDING=1, IMPORTED=2 (single dataset), AI_VERIFIED=2
    // (single source + AI cross-check), default CLI add-place=3 (admin
    // researched + cross-checked but did NOT manually click Admin-review).
    verification_level: PENDING ? 1 : (IMPORTED || AI_VERIFIED ? 2 : 3),
    // verification_method intentionally never set to 'admin_review' from CLI.
    // 'admin_review' is only assigned when an admin uses the data-quality
    // page or place page UI to confirm a record manually.
    verification_method: PENDING ? null : (AI_VERIFIED ? 'ai_verified' : 'imported'),
    last_verified_at: PENDING ? null : new Date().toISOString(),
    source,
    source_id,
    slug,
    tags,
    opening_hours: input.opening_hours ?? null,
    main_image_url,
    images,
  }

  summarize(payload)

  if (DRY_RUN) {
    console.log('\n(dry-run — not inserting)')
    return
  }

  const adminId = await findAdminId()
  const { data, error } = await supabase.from('places').insert({ ...payload, created_by: adminId }).select('slug').single()
  if (error) {
    console.error(`\n✗ Insert failed: ${error.message}`)
    process.exit(1)
  }

  console.log(`\n✓ Inserted.`)
  console.log(`  Public URL: https://www.plantspack.com/place/${data.slug}`)
  console.log(`  Source tag: ${source} / ${source_id}`)
  console.log(`  Status:     ${PENDING ? 'pending (visible in admin queue)' : 'approved + verified (live)'}`)
}

main().catch(e => { console.error(e); process.exit(1) })
