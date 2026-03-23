/**
 * Place Verification Pipeline
 *
 * Cross-references places against OpenStreetMap, Google Places (optional),
 * and web sources to verify existence, vegan status, and data accuracy.
 *
 * Usage:
 *   npx tsx scripts/verify-places.ts --input places.json --output verified.json
 *   npx tsx scripts/verify-places.ts --from-supabase --limit 50
 *   npx tsx scripts/verify-places.ts --input places.json --min-score 70 --output high-confidence.json
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import * as fs from 'fs'
import { createClient } from '@supabase/supabase-js'

// ─── Types ───────────────────────────────────────────────────────

interface PlaceInput {
  name: string
  address: string
  latitude: number
  longitude: number
  category?: string
  description?: string
  website?: string
  phone?: string
  is_pet_friendly?: boolean
  city?: string
  country?: string
  source?: string
  source_id?: string
  // Any extra fields from the input
  [key: string]: any
}

interface VerificationResult {
  osm: OSMResult | null
  google: GoogleResult | null
  web: WebResult | null
  ai: AIResult | null
}

interface OSMResult {
  found: boolean
  matchScore: number // 0-100
  osmId?: string
  osmName?: string
  osmTags?: Record<string, string>
  isVegan?: boolean
  isVeganFriendly?: boolean
  distance?: number // meters from input coords
}

interface GoogleResult {
  found: boolean
  matchScore: number
  placeId?: string
  googleName?: string
  rating?: number
  totalRatings?: number
  isOpen?: boolean
  types?: string[]
}

interface WebResult {
  websiteActive: boolean
  statusCode?: number
  hasVeganKeywords: boolean
  pageTitle?: string
}

interface AIResult {
  overallAssessment: string
  veganConfidence: number // 0-100
  existenceConfidence: number // 0-100
  dataAccuracyNotes: string[]
  suggestedCorrections: Record<string, any>
}

interface VerifiedPlace extends PlaceInput {
  _verification: {
    score: number
    breakdown: {
      osmExistence: number
      googleExistence: number
      websiteActive: number
      nameConsistency: number
      locationAccuracy: number
      veganConfidence: number
      dataCompleteness: number
    }
    sources: VerificationResult
    verifiedAt: string
    flags: string[]
    suggestedUpdates: Record<string, any>
  }
}

// ─── Config ──────────────────────────────────────────────────────

const OVERPASS_API = 'https://overpass-api.de/api/interpreter'
const NOMINATIM_API = 'https://nominatim.openstreetmap.org'
const GOOGLE_PLACES_API = 'https://maps.googleapis.com/maps/api/place'

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

const DELAY_MS = 1100 // Rate limiting for OSM/Nominatim (1 req/sec)

// ─── OSM Verification ────────────────────────────────────────────

async function verifyWithOSM(place: PlaceInput): Promise<OSMResult> {
  try {
    // Search within 200m radius for places with matching name
    const radius = 200
    const query = `
      [out:json][timeout:10];
      (
        node(around:${radius},${place.latitude},${place.longitude})["name"];
        way(around:${radius},${place.latitude},${place.longitude})["name"];
      );
      out body;
    `

    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    if (!response.ok) {
      console.warn(`  OSM API error: ${response.status}`)
      return { found: false, matchScore: 0 }
    }

    const data = await response.json()
    const elements = data.elements || []

    if (elements.length === 0) {
      return { found: false, matchScore: 0 }
    }

    // Find best matching element by name similarity
    let bestMatch: any = null
    let bestScore = 0

    for (const el of elements) {
      const osmName = el.tags?.name || ''
      const similarity = nameSimilarity(place.name, osmName)
      if (similarity > bestScore) {
        bestScore = similarity
        bestMatch = el
      }
    }

    if (!bestMatch || bestScore < 0.3) {
      // No good name match, but there are POIs nearby
      return { found: false, matchScore: 10 }
    }

    const tags = bestMatch.tags || {}
    const isVegan = tags['diet:vegan'] === 'yes' || tags['diet:vegan'] === 'only' ||
                    (tags.cuisine || '').includes('vegan')
    const isVeganFriendly = isVegan || tags['diet:vegan'] === 'limited' ||
                            tags['diet:vegetarian'] === 'yes'

    // Calculate distance
    const elLat = bestMatch.lat || bestMatch.center?.lat
    const elLon = bestMatch.lon || bestMatch.center?.lon
    const distance = elLat && elLon ? haversineDistance(place.latitude, place.longitude, elLat, elLon) : undefined

    return {
      found: true,
      matchScore: Math.round(bestScore * 100),
      osmId: `${bestMatch.type}/${bestMatch.id}`,
      osmName: tags.name,
      osmTags: tags,
      isVegan,
      isVeganFriendly,
      distance,
    }
  } catch (error) {
    console.warn(`  OSM error: ${(error as Error).message}`)
    return { found: false, matchScore: 0 }
  }
}

// ─── Google Places Verification ──────────────────────────────────

async function verifyWithGoogle(place: PlaceInput): Promise<GoogleResult> {
  if (!GOOGLE_API_KEY) {
    return { found: false, matchScore: 0 }
  }

  try {
    const query = encodeURIComponent(`${place.name} ${place.city || ''} ${place.country || ''}`)
    const url = `${GOOGLE_PLACES_API}/textsearch/json?query=${query}&location=${place.latitude},${place.longitude}&radius=500&key=${GOOGLE_API_KEY}`

    const response = await fetch(url)
    if (!response.ok) return { found: false, matchScore: 0 }

    const data = await response.json()
    const results = data.results || []

    if (results.length === 0) return { found: false, matchScore: 0 }

    // Find best match
    let bestMatch: any = null
    let bestScore = 0

    for (const result of results) {
      const similarity = nameSimilarity(place.name, result.name)
      if (similarity > bestScore) {
        bestScore = similarity
        bestMatch = result
      }
    }

    if (!bestMatch || bestScore < 0.3) {
      return { found: false, matchScore: 10 }
    }

    return {
      found: true,
      matchScore: Math.round(bestScore * 100),
      placeId: bestMatch.place_id,
      googleName: bestMatch.name,
      rating: bestMatch.rating,
      totalRatings: bestMatch.user_ratings_total,
      isOpen: bestMatch.opening_hours?.open_now,
      types: bestMatch.types,
    }
  } catch (error) {
    console.warn(`  Google error: ${(error as Error).message}`)
    return { found: false, matchScore: 0 }
  }
}

// ─── Website Verification ────────────────────────────────────────

async function verifyWebsite(place: PlaceInput): Promise<WebResult> {
  if (!place.website) {
    return { websiteActive: false, hasVeganKeywords: false }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(place.website, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'PlantsPack-Verifier/1.0' },
    })
    clearTimeout(timeout)

    const statusCode = response.status
    const websiteActive = statusCode >= 200 && statusCode < 400

    let hasVeganKeywords = false
    let pageTitle = ''

    if (websiteActive) {
      const html = await response.text()
      const lowerHtml = html.toLowerCase()
      hasVeganKeywords = lowerHtml.includes('vegan') ||
                         lowerHtml.includes('plant-based') ||
                         lowerHtml.includes('plant based')

      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
      pageTitle = titleMatch ? titleMatch[1].trim().substring(0, 100) : ''
    }

    return { websiteActive, statusCode, hasVeganKeywords, pageTitle }
  } catch (error) {
    return { websiteActive: false, hasVeganKeywords: false }
  }
}

// ─── AI Verification (OpenAI) ────────────────────────────────────

async function verifyWithAI(place: PlaceInput, otherResults: { osm: OSMResult, google: GoogleResult, web: WebResult }): Promise<AIResult> {
  if (!OPENAI_API_KEY) {
    return {
      overallAssessment: 'AI verification skipped (no API key)',
      veganConfidence: 0,
      existenceConfidence: 0,
      dataAccuracyNotes: [],
      suggestedCorrections: {},
    }
  }

  try {
    const prompt = `You are verifying a vegan place for a community platform. Analyze this data and provide your assessment.

PLACE DATA:
- Name: ${place.name}
- Address: ${place.address}
- Coordinates: ${place.latitude}, ${place.longitude}
- Category: ${place.category || 'unknown'}
- Description: ${place.description || 'none'}
- Website: ${place.website || 'none'}
- Claims pet-friendly: ${place.is_pet_friendly ?? 'unknown'}

VERIFICATION RESULTS:
- OSM: ${otherResults.osm.found ? `Found (${otherResults.osm.osmName}, vegan=${otherResults.osm.isVegan}, distance=${otherResults.osm.distance}m)` : 'Not found'}
- Google: ${otherResults.google.found ? `Found (${otherResults.google.googleName}, rating=${otherResults.google.rating}, reviews=${otherResults.google.totalRatings})` : 'Not found / not checked'}
- Website: ${otherResults.web.websiteActive ? `Active (vegan keywords: ${otherResults.web.hasVeganKeywords})` : 'Inactive or no website'}

Respond in this exact JSON format:
{
  "overallAssessment": "one sentence summary",
  "veganConfidence": <0-100>,
  "existenceConfidence": <0-100>,
  "dataAccuracyNotes": ["note1", "note2"],
  "suggestedCorrections": {"field": "corrected value"}
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      console.warn(`  AI API error: ${response.status}`)
      return { overallAssessment: 'AI check failed', veganConfidence: 0, existenceConfidence: 0, dataAccuracyNotes: [], suggestedCorrections: {} }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    return { overallAssessment: content.substring(0, 200), veganConfidence: 0, existenceConfidence: 0, dataAccuracyNotes: [], suggestedCorrections: {} }
  } catch (error) {
    console.warn(`  AI error: ${(error as Error).message}`)
    return { overallAssessment: 'AI check failed', veganConfidence: 0, existenceConfidence: 0, dataAccuracyNotes: [], suggestedCorrections: {} }
  }
}

// ─── Confidence Score Calculation ────────────────────────────────

function calculateScore(place: PlaceInput, results: VerificationResult): VerifiedPlace['_verification'] {
  const osm = results.osm || { found: false, matchScore: 0 }
  const google = results.google || { found: false, matchScore: 0 }
  const web = results.web || { websiteActive: false, hasVeganKeywords: false }
  const ai = results.ai || { veganConfidence: 0, existenceConfidence: 0, suggestedCorrections: {} }

  // Breakdown (total = 100)
  const breakdown = {
    osmExistence: 0,        // max 25
    googleExistence: 0,     // max 20
    websiteActive: 0,       // max 10
    nameConsistency: 0,     // max 10
    locationAccuracy: 0,    // max 10
    veganConfidence: 0,     // max 15
    dataCompleteness: 0,    // max 10
  }

  // OSM existence (25 pts)
  if (osm.found) {
    breakdown.osmExistence = Math.round(osm.matchScore * 0.25)
  }

  // Google existence (20 pts)
  if (google.found) {
    breakdown.googleExistence = Math.round(google.matchScore * 0.20)
  }

  // Website (10 pts)
  if (web.websiteActive) {
    breakdown.websiteActive = 7
    if (web.hasVeganKeywords) breakdown.websiteActive = 10
  }

  // Name consistency across sources (10 pts)
  const names = [place.name, osm.osmName, google.googleName].filter(Boolean) as string[]
  if (names.length >= 2) {
    const avgSimilarity = names.slice(1).reduce((sum, n) => sum + nameSimilarity(names[0], n), 0) / (names.length - 1)
    breakdown.nameConsistency = Math.round(avgSimilarity * 10)
  }

  // Location accuracy (10 pts)
  if (osm.found && osm.distance !== undefined) {
    if (osm.distance < 50) breakdown.locationAccuracy = 10
    else if (osm.distance < 100) breakdown.locationAccuracy = 8
    else if (osm.distance < 200) breakdown.locationAccuracy = 5
    else breakdown.locationAccuracy = 2
  } else if (google.found) {
    breakdown.locationAccuracy = 6 // Google found nearby = decent
  }

  // Vegan confidence (15 pts)
  if (osm.isVegan) {
    breakdown.veganConfidence = 15
  } else if (osm.isVeganFriendly) {
    breakdown.veganConfidence = 10
  } else if (web.hasVeganKeywords) {
    breakdown.veganConfidence = 8
  } else if (ai.veganConfidence > 70) {
    breakdown.veganConfidence = Math.round(ai.veganConfidence * 0.12)
  }

  // Data completeness (10 pts)
  let completeness = 0
  if (place.name) completeness += 2
  if (place.address) completeness += 2
  if (place.latitude && place.longitude) completeness += 2
  if (place.website) completeness += 1
  if (place.phone) completeness += 1
  if (place.description) completeness += 1
  if (place.category) completeness += 1
  breakdown.dataCompleteness = completeness

  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0)

  // Flags
  const flags: string[] = []
  if (!osm.found && !google.found) flags.push('NOT_FOUND_IN_ANY_SOURCE')
  if (osm.found && !osm.isVegan && !osm.isVeganFriendly) flags.push('OSM_NOT_TAGGED_VEGAN')
  if (place.website && !web.websiteActive) flags.push('WEBSITE_DOWN')
  if (osm.found && osm.distance && osm.distance > 150) flags.push('LOCATION_MISMATCH')
  if (score < 30) flags.push('LOW_CONFIDENCE')

  // Merge AI suggested corrections
  const suggestedUpdates: Record<string, any> = { ...ai.suggestedCorrections }
  if (osm.found && osm.osmName && nameSimilarity(place.name, osm.osmName) < 0.9) {
    suggestedUpdates.name_from_osm = osm.osmName
  }
  if (google.found && google.googleName && nameSimilarity(place.name, google.googleName!) < 0.9) {
    suggestedUpdates.name_from_google = google.googleName
  }

  return {
    score,
    breakdown,
    sources: results,
    verifiedAt: new Date().toISOString(),
    flags,
    suggestedUpdates,
  }
}

// ─── Utilities ───────────────────────────────────────────────────

function nameSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  const na = normalize(a)
  const nb = normalize(b)

  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85

  // Jaccard similarity on words
  const wordsA = new Set(na.split(/\s+/))
  const wordsB = new Set(nb.split(/\s+/))
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)))
  const union = new Set([...wordsA, ...wordsB])

  return union.size > 0 ? intersection.size / union.size : 0
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Main Pipeline ───────────────────────────────────────────────

async function verifyPlace(place: PlaceInput, index: number, total: number): Promise<VerifiedPlace> {
  console.log(`\n[${index + 1}/${total}] Verifying: ${place.name}`)
  console.log(`  📍 ${place.address || `${place.latitude}, ${place.longitude}`}`)

  // Step 1: OSM
  console.log('  🗺️  Checking OpenStreetMap...')
  const osm = await verifyWithOSM(place)
  console.log(`  ${osm.found ? '✅' : '❌'} OSM: ${osm.found ? `Found "${osm.osmName}" (${osm.matchScore}% match, ${osm.distance?.toFixed(0)}m away, vegan=${osm.isVegan})` : 'Not found'}`)
  await sleep(DELAY_MS)

  // Step 2: Google (if key available)
  let google: GoogleResult = { found: false, matchScore: 0 }
  if (GOOGLE_API_KEY) {
    console.log('  🔍 Checking Google Places...')
    google = await verifyWithGoogle(place)
    console.log(`  ${google.found ? '✅' : '❌'} Google: ${google.found ? `Found "${google.googleName}" (rating=${google.rating}, ${google.totalRatings} reviews)` : 'Not found'}`)
    await sleep(300)
  }

  // Step 3: Website
  console.log('  🌐 Checking website...')
  const web = await verifyWebsite(place)
  console.log(`  ${web.websiteActive ? '✅' : '⚠️'} Website: ${web.websiteActive ? `Active (vegan keywords: ${web.hasVeganKeywords})` : place.website ? 'Down/unreachable' : 'No URL'}`)

  // Step 4: AI analysis
  let ai: AIResult | null = null
  if (OPENAI_API_KEY && !(globalThis as any).__SKIP_AI) {
    console.log('  🤖 AI analysis...')
    ai = await verifyWithAI(place, { osm, google, web })
    console.log(`  📊 AI: existence=${ai.existenceConfidence}% vegan=${ai.veganConfidence}% — ${ai.overallAssessment}`)
    await sleep(200)
  }

  // Calculate score
  const verification = calculateScore(place, { osm, google, web, ai })
  console.log(`  🎯 Score: ${verification.score}/100 ${verification.flags.length > 0 ? `[${verification.flags.join(', ')}]` : ''}`)

  return {
    ...place,
    _verification: verification,
  }
}

async function loadPlacesFromSupabase(limit: number): Promise<PlaceInput[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(p => ({
    name: p.name,
    address: p.address,
    latitude: p.latitude,
    longitude: p.longitude,
    category: p.category,
    description: p.description,
    website: p.website,
    phone: p.phone,
    is_pet_friendly: p.is_pet_friendly,
    city: p.city,
    country: p.country,
    source: p.source,
    source_id: p.source_id,
    _supabase_id: p.id,
  }))
}

// ─── CLI ─────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const getArg = (name: string) => {
    const idx = args.indexOf(name)
    return idx !== -1 ? args[idx + 1] : undefined
  }

  const inputFile = getArg('--input')
  const outputFile = getArg('--output') || 'verified-places.json'
  const fromSupabase = args.includes('--from-supabase')
  const limit = parseInt(getArg('--limit') || '50')
  const minScore = parseInt(getArg('--min-score') || '0')
  const skipAI = args.includes('--skip-ai')

  if (skipAI) {
    (globalThis as any).__SKIP_AI = true
  }

  console.log('🌿 PlantsPack Place Verification Pipeline')
  console.log('=========================================')
  console.log(`OSM:    ✅ Available (Overpass API)`)
  console.log(`Google: ${GOOGLE_API_KEY ? '✅ Available' : '⚠️  No API key (set GOOGLE_PLACES_API_KEY)'}`)
  console.log(`AI:     ${OPENAI_API_KEY && !skipAI ? '✅ Available (GPT-4o-mini)' : '⚠️  Skipped'}`)
  console.log()

  // Load places
  let places: PlaceInput[]

  if (fromSupabase) {
    console.log(`Loading up to ${limit} places from Supabase...`)
    places = await loadPlacesFromSupabase(limit)
  } else if (inputFile) {
    console.log(`Loading places from ${inputFile}...`)
    const raw = fs.readFileSync(inputFile, 'utf-8')
    places = JSON.parse(raw)
    if (!Array.isArray(places)) places = [places]
  } else {
    console.error('Usage: npx tsx scripts/verify-places.ts --input places.json')
    console.error('       npx tsx scripts/verify-places.ts --from-supabase --limit 50')
    console.error('\nOptions:')
    console.error('  --input <file>     Input JSON file with places array')
    console.error('  --output <file>    Output file (default: verified-places.json)')
    console.error('  --from-supabase    Load places from Supabase database')
    console.error('  --limit <n>        Max places to verify (default: 50)')
    console.error('  --min-score <n>    Only output places with score >= n')
    console.error('  --skip-ai          Skip AI verification (faster, cheaper)')
    process.exit(1)
  }

  if (limit) places = places.slice(0, limit)
  console.log(`Loaded ${places.length} places to verify.\n`)

  // Verify each place
  const verified: VerifiedPlace[] = []

  for (let i = 0; i < places.length; i++) {
    const result = await verifyPlace(places[i], i, places.length)
    verified.push(result)
  }

  // Sort by score descending
  verified.sort((a, b) => b._verification.score - a._verification.score)

  // Filter by min score
  const filtered = minScore > 0
    ? verified.filter(p => p._verification.score >= minScore)
    : verified

  // Summary
  console.log('\n\n📊 VERIFICATION SUMMARY')
  console.log('========================')
  console.log(`Total verified:  ${verified.length}`)
  console.log(`Score >= 70:     ${verified.filter(p => p._verification.score >= 70).length}`)
  console.log(`Score 40-69:     ${verified.filter(p => p._verification.score >= 40 && p._verification.score < 70).length}`)
  console.log(`Score < 40:      ${verified.filter(p => p._verification.score < 40).length}`)
  console.log(`Avg score:       ${(verified.reduce((s, p) => s + p._verification.score, 0) / verified.length).toFixed(1)}`)
  console.log()

  // Top places
  console.log('🏆 TOP VERIFIED PLACES:')
  filtered.slice(0, 15).forEach((p, i) => {
    const v = p._verification
    console.log(`  ${i + 1}. [${v.score}] ${p.name} — ${p.address?.substring(0, 50)}${v.flags.length ? ` ⚠️ ${v.flags.join(', ')}` : ''}`)
  })

  // Flagged places
  const flagged = verified.filter(p => p._verification.flags.length > 0)
  if (flagged.length > 0) {
    console.log(`\n⚠️  FLAGGED PLACES (${flagged.length}):`)
    flagged.forEach(p => {
      console.log(`  [${p._verification.score}] ${p.name} — ${p._verification.flags.join(', ')}`)
    })
  }

  // Write output
  const output = {
    metadata: {
      verifiedAt: new Date().toISOString(),
      totalInput: places.length,
      totalOutput: filtered.length,
      minScoreFilter: minScore,
      sourcesUsed: {
        osm: true,
        google: !!GOOGLE_API_KEY,
        ai: !!OPENAI_API_KEY && !skipAI,
      },
    },
    // Clean output: places without _verification for import
    importReady: filtered.map(p => {
      const { _verification, _supabase_id, ...clean } = p as any
      // Apply AI-suggested corrections
      const updates = _verification.suggestedUpdates || {}
      return {
        ...clean,
        ...updates.name_from_osm ? {} : {},  // Keep original name unless explicitly corrected
        _confidence: _verification.score,
        _flags: _verification.flags,
      }
    }),
    // Full data with verification details
    fullResults: filtered,
  }

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2))
  console.log(`\n✅ Results written to ${outputFile}`)
  console.log(`   ${filtered.length} places ready for import (${minScore > 0 ? `score >= ${minScore}` : 'all'})`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
