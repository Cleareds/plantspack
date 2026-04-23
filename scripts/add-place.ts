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

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const PENDING = args.has('--pending')

interface PlacePayload {
  name: string
  city: string
  country: string
  category: 'eat' | 'hotel' | 'store' | 'organisation' | 'event'
  vegan_level: 'fully_vegan' | 'vegan_friendly'
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

async function scrapeHeroImage(url: string): Promise<string | null> {
  // Multi-pass: try the homepage + common hero/gallery paths with multiple
  // user agents (some sites gate on Googlebot, others on real browsers).
  // Collect every plausible candidate, then size-rank by fetching headers
  // and returning the biggest non-logo raster image.
  const UAS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  ]
  const PATHS = ['', '/menu', '/menus', '/gallery', '/about', '/about-us', '/food', '/press', '/location']
  const SKIP = /logo|favicon|sprite|icon|avatar|emoji|placeholder|\.svg(\?|$)/i

  const candidates = new Set<string>()
  for (const p of PATHS) {
    let pageUrl: string
    try { pageUrl = new URL(p, url).toString() } catch { continue }
    for (const ua of UAS) {
      try {
        const res = await fetch(pageUrl, {
          headers: { 'User-Agent': ua, 'Accept': 'text/html' },
          signal: AbortSignal.timeout(12000),
          redirect: 'follow',
        })
        if (!res.ok) continue
        const ct = res.headers.get('content-type') || ''
        if (!ct.includes('html')) continue
        const html = await res.text()

        // og:image — but only if content is non-empty (Baladi's "" case).
        const og = html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i)
        if (og?.[1]?.trim()) { try { candidates.add(new URL(og[1], pageUrl).toString()) } catch {} }
        const ogRev = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
        if (ogRev?.[1]?.trim()) { try { candidates.add(new URL(ogRev[1], pageUrl).toString()) } catch {} }
        const tw = html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i)
        if (tw?.[1]?.trim()) { try { candidates.add(new URL(tw[1], pageUrl).toString()) } catch {} }

        // <img>, data-src, data-original, data-lazy-src, and srcset attrs.
        const imgRe = /<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["']([^"']+)["']/gi
        let m: RegExpExecArray | null
        while ((m = imgRe.exec(html)) !== null) {
          try {
            const abs = new URL(m[1], pageUrl).toString()
            if (!SKIP.test(abs)) candidates.add(abs)
          } catch {}
        }
        const srcsetRe = /srcset=["']([^"']+)["']/gi
        while ((m = srcsetRe.exec(html)) !== null) {
          for (const tok of m[1].split(',')) {
            const u = tok.trim().split(/\s+/)[0]
            if (!u) continue
            try {
              const abs = new URL(u, pageUrl).toString()
              if (!SKIP.test(abs)) candidates.add(abs)
            } catch {}
          }
        }
        break // first UA that returned HTML is enough per path
      } catch { /* fall through to next UA */ }
    }
  }

  if (candidates.size === 0) return null

  // Size-rank top 30 candidates. Fetch headers + first bytes, parse
  // dimensions via Node's sharp (already a project dep). Pick the biggest
  // non-logo raster. Skips anything < 600px wide or extreme aspect ratios.
  const list = Array.from(candidates).slice(0, 30)
  const measured: { u: string; area: number }[] = []
  for (const u of list) {
    try {
      const r = await fetch(u, {
        headers: { 'User-Agent': UAS[0], 'Accept': 'image/*' },
        signal: AbortSignal.timeout(10000),
      })
      if (!r.ok) continue
      const ct = r.headers.get('content-type') || ''
      if (!ct.startsWith('image/')) continue
      const buf = Buffer.from(await r.arrayBuffer())
      if (buf.length < 5000) continue
      // sharp is a transitive dep; require() at runtime to avoid hard-linking
      // it into the CLI if it's ever pruned. No-op fallback: skip measurement.
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const sharp = require('sharp')
        const meta = await sharp(buf).metadata()
        if (!meta.width || !meta.height) continue
        if (meta.width < 600 || meta.height < 300) continue
        if (meta.width / meta.height > 6 || meta.height / meta.width > 3) continue
        measured.push({ u, area: meta.width * meta.height })
      } catch {
        // Can't measure without sharp — fall back to bytes as a rough proxy.
        measured.push({ u, area: buf.length })
      }
    } catch { /* unreachable / bad url, skip */ }
  }
  if (measured.length === 0) return null
  measured.sort((a, b) => b.area - a.area)
  return measured[0].u
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

  // Defaults + derived fields.
  const source = input.source || `manual-${todayIso()}`
  const source_id = input.source_id || slugify(`${input.name}-${input.city}`)
  const slug = input.slug || source_id

  // De-dupe.
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
    city: input.city,
    country: input.country,
    vegan_level: input.vegan_level,
    verification_status: PENDING ? 'pending' : 'approved',
    is_verified: !PENDING,
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
