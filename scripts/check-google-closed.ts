/**
 * Google Places Closed-Business Detector
 *
 * Checks places against Google Places API to detect permanently closed businesses.
 * Designed to run both locally (full scan) and in CI (daily batches).
 * Tracks check dates via tags (google_checked:YYYY-MM-DD) — skips places checked within 90 days.
 *
 * Usage:
 *   npx tsx scripts/check-google-closed.ts                    # Check 200 unchecked places (CI mode)
 *   npx tsx scripts/check-google-closed.ts --limit 500        # Check 500 places
 *   npx tsx scripts/check-google-closed.ts --flagged-first    # Prioritize already-flagged places
 *   npx tsx scripts/check-google-closed.ts --city Boulder     # Check specific city
 *   npx tsx scripts/check-google-closed.ts --country "United States"  # Check specific country
 *   npx tsx scripts/check-google-closed.ts --delete           # Auto-delete confirmed closed places
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.plantspack.com'
const RECHECK_DAYS = 90 // Don't re-check places within this window

if (!GOOGLE_API_KEY) {
  console.error('Missing GOOGLE_PLACES_API_KEY in environment')
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in environment')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

interface PlaceRecord {
  id: string
  name: string
  slug: string | null
  address: string
  city: string | null
  country: string | null
  latitude: number
  longitude: number
  tags: string[] | null
  website: string | null
}

interface GoogleCheckResult {
  place: PlaceRecord
  googleName: string | null
  businessStatus: string // OPERATIONAL | CLOSED_PERMANENTLY | CLOSED_TEMPORARILY | NOT_FOUND
  googleAddress: string | null
}

// ─── Google Places API ──────────────────────────────────────────

async function checkBusinessStatus(place: PlaceRecord): Promise<GoogleCheckResult> {
  const query = encodeURIComponent(`${place.name} ${place.city || ''} ${place.country || ''}`)
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=name,business_status,formatted_address,geometry&locationbias=point:${place.latitude},${place.longitude}&key=${GOOGLE_API_KEY}`

  try {
    const res = await fetch(url)
    const data = await res.json()

    if (data.status === 'REQUEST_DENIED') {
      console.error('Google API key error:', data.error_message)
      process.exit(1)
    }

    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0]
      return {
        place,
        googleName: candidate.name || null,
        businessStatus: candidate.business_status || 'UNKNOWN',
        googleAddress: candidate.formatted_address || null,
      }
    }

    return { place, googleName: null, businessStatus: 'NOT_FOUND', googleAddress: null }
  } catch (err) {
    console.warn(`  API error for "${place.name}": ${(err as Error).message}`)
    return { place, googleName: null, businessStatus: 'ERROR', googleAddress: null }
  }
}

// ─── Database Operations ────────────────────────────────────────

function wasCheckedRecently(tags: string[] | null): boolean {
  if (!tags) return false
  const checkTag = tags.find(t => t.startsWith('google_checked:'))
  if (!checkTag) return false
  const checkDate = checkTag.split(':')[1]
  const diffMs = Date.now() - new Date(checkDate).getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays < RECHECK_DAYS
}

async function fetchPlaces(opts: {
  limit: number
  flaggedFirst: boolean
  city?: string
  country?: string
}): Promise<PlaceRecord[]> {
  const results: PlaceRecord[] = []
  const seenIds = new Set<string>()

  // Helper to add places, filtering already-seen and recently-checked
  const addPlaces = (data: PlaceRecord[] | null, max: number) => {
    if (!data) return
    for (const p of data) {
      if (results.length >= max) break
      if (seenIds.has(p.id)) continue
      if (wasCheckedRecently(p.tags)) continue
      seenIds.add(p.id)
      results.push(p)
    }
  }

  // If flaggedFirst, get flagged places first
  if (opts.flaggedFirst) {
    let query = supabase
      .from('places')
      .select('id, name, slug, address, city, country, latitude, longitude, tags, website')
      .or('tags.cs.{website_unreachable},tags.cs.{possibly_closed}')
      .limit(opts.limit * 2) // fetch extra to account for recently-checked filtering

    if (opts.city) query = query.eq('city', opts.city)
    if (opts.country) query = query.eq('country', opts.country)

    const { data } = await query
    addPlaces(data, opts.limit)
  }

  // Fill remaining slots with all places, oldest-checked first
  const remaining = opts.limit - results.length
  if (remaining > 0) {
    let query = supabase
      .from('places')
      .select('id, name, slug, address, city, country, latitude, longitude, tags, website')
      .order('updated_at', { ascending: true })
      .limit(remaining * 2) // fetch extra to account for filtering

    if (opts.city) query = query.eq('city', opts.city)
    if (opts.country) query = query.eq('country', opts.country)

    const { data } = await query
    addPlaces(data, opts.limit)
  }

  return results
}

async function tagPlace(id: string, currentTags: string[] | null, addTags: string[], removeTags: string[] = []) {
  let tags = [...(currentTags || [])]
  // Remove old google_checked:* date tags and specified removeTags
  tags = tags.filter(t => !removeTags.includes(t) && !t.startsWith('google_checked:'))
  // Add date-stamped check tag
  tags.push(`google_checked:${today}`)
  // Add other tags (dedup)
  for (const tag of addTags) {
    if (!tags.includes(tag)) tags.push(tag)
  }
  await supabase.from('places').update({ tags, updated_at: new Date().toISOString() }).eq('id', id)
}

async function deletePlace(place: PlaceRecord) {
  // Clean up related records
  await supabase.from('place_reviews').delete().eq('place_id', place.id)
  await supabase.from('favorite_places').delete().eq('place_id', place.id)
  await supabase.from('pack_places').delete().eq('place_id', place.id)
  await supabase.from('place_corrections').delete().eq('place_id', place.id)
  const { error } = await supabase.from('places').delete().eq('id', place.id)
  if (error) {
    console.log(`  Failed to delete "${place.name}": ${error.message}`)
    return false
  }
  // Revalidate the individual place page so it returns 404
  const slug = place.slug || place.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  try {
    await fetch(`${SITE_URL}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: `/place/${slug}` }),
    })
  } catch {}
  return true
}

// Track which cities/countries had deletions for cache revalidation
const affectedPaths = new Set<string>()

async function revalidateCache() {
  if (affectedPaths.size === 0) return
  console.log(`\n🔄 Revalidating ${affectedPaths.size} cached pages...`)

  for (const path of affectedPaths) {
    try {
      await fetch(`${SITE_URL}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
    } catch {
      // Revalidation is best-effort
    }
  }

  // Also revalidate main directories and city ranks
  try {
    await fetch(`${SITE_URL}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  } catch {}

  // Refresh materialized views
  try { await supabase.rpc('refresh_directory_views') } catch {}
  console.log('Cache revalidated and directory views refreshed.')
}

function trackAffectedPlace(place: PlaceRecord) {
  if (place.country && place.city) {
    const countrySlug = place.country.toLowerCase().replace(/\s+/g, '-')
    const citySlug = place.city.toLowerCase().replace(/\s+/g, '-')
    affectedPaths.add(`/vegan-places/${countrySlug}/${citySlug}`)
    affectedPaths.add(`/vegan-places/${countrySlug}`)
  }
  affectedPaths.add('/vegan-places')
  affectedPaths.add('/city-ranks')
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const getArg = (name: string) => {
    const idx = args.indexOf(name)
    return idx !== -1 ? args[idx + 1] : undefined
  }

  const limit = parseInt(getArg('--limit') || '200')
  const flaggedFirst = args.includes('--flagged-first')
  const autoDelete = args.includes('--delete')
  const city = getArg('--city')
  const country = getArg('--country')

  console.log('🔍 Google Places Closed-Business Detector')
  console.log('==========================================')
  console.log(`Limit: ${limit} | Flagged first: ${flaggedFirst} | Auto-delete: ${autoDelete}`)
  if (city) console.log(`City filter: ${city}`)
  if (country) console.log(`Country filter: ${country}`)
  console.log()

  const places = await fetchPlaces({ limit, flaggedFirst, city, country })
  console.log(`Loaded ${places.length} places to check.\n`)

  if (places.length === 0) {
    console.log('All places have been checked (google_checked tag present).')
    console.log('To re-check, remove the google_checked tag from places.')
    return
  }

  const results: { closed: GoogleCheckResult[]; tempClosed: GoogleCheckResult[]; operational: GoogleCheckResult[]; notFound: GoogleCheckResult[]; errors: GoogleCheckResult[] } = {
    closed: [], tempClosed: [], operational: [], notFound: [], errors: [],
  }

  for (let i = 0; i < places.length; i++) {
    const place = places[i]
    if ((i + 1) % 50 === 0) console.log(`Progress: ${i + 1}/${places.length}`)

    const result = await checkBusinessStatus(place)

    switch (result.businessStatus) {
      case 'CLOSED_PERMANENTLY':
        results.closed.push(result)
        console.log(`  ❌ CLOSED: ${place.name} (${place.city}) — Google: "${result.googleName}"`)
        trackAffectedPlace(place)

        if (autoDelete) {
          const deleted = await deletePlace(place)
          if (deleted) console.log(`    🗑️  Deleted from database`)
        } else {
          await tagPlace(place.id, place.tags, ['google_confirmed_closed'])
        }
        break

      case 'CLOSED_TEMPORARILY':
        results.tempClosed.push(result)
        console.log(`  ⚠️  TEMP CLOSED: ${place.name} (${place.city})`)
        await tagPlace(place.id, place.tags, ['google_temporarily_closed'])
        break

      case 'OPERATIONAL':
        results.operational.push(result)
        // Mark as checked, remove stale flags if present
        await tagPlace(place.id, place.tags, [], ['google_confirmed_closed', 'google_temporarily_closed', 'google_not_found'])
        break

      case 'NOT_FOUND':
        results.notFound.push(result)
        await tagPlace(place.id, place.tags, ['google_not_found'])
        break

      case 'ERROR':
        results.errors.push(result)
        break

      default:
        await tagPlace(place.id, place.tags, [])
        results.operational.push(result)
    }

    // Rate limit: ~5 requests/second
    await new Promise(r => setTimeout(r, 200))
  }

  // Summary
  console.log('\n==========================================')
  console.log('📊 RESULTS')
  console.log('==========================================')
  console.log(`✅ Operational:         ${results.operational.length}`)
  console.log(`❌ Permanently closed:  ${results.closed.length}`)
  console.log(`⚠️  Temporarily closed: ${results.tempClosed.length}`)
  console.log(`❓ Not found on Google: ${results.notFound.length}`)
  console.log(`💥 Errors:              ${results.errors.length}`)

  if (results.closed.length > 0) {
    console.log('\n❌ PERMANENTLY CLOSED PLACES:')
    results.closed.forEach(r => {
      console.log(`  - ${r.place.name} (${r.place.city}, ${r.place.country})`)
      console.log(`    Google: "${r.googleName}" at ${r.googleAddress}`)
      if (autoDelete) console.log(`    → DELETED`)
      else console.log(`    → Tagged as google_confirmed_closed`)
    })
  }

  if (results.tempClosed.length > 0) {
    console.log('\n⚠️  TEMPORARILY CLOSED PLACES:')
    results.tempClosed.forEach(r => {
      console.log(`  - ${r.place.name} (${r.place.city}, ${r.place.country})`)
    })
  }

  // Revalidate cache for affected pages
  await revalidateCache()

  console.log(`\nEstimated API cost: $${((places.length / 1000) * 17).toFixed(2)}`)
  console.log(`(covered by $200/month Google Cloud free tier)`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
