/**
 * OSM Vegan Places Import Pipeline — WORLDWIDE
 *
 * Extracts vegan places from OpenStreetMap via Overpass API for all continents.
 * Rotates between Overpass endpoints to avoid rate limits.
 *
 * Usage:
 *   npx tsx scripts/import-osm-worldwide.ts
 *   npx tsx scripts/import-osm-worldwide.ts --region=north-america
 *   npx tsx scripts/import-osm-worldwide.ts --only-vegan-only
 *   npx tsx scripts/import-osm-worldwide.ts --resume
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import * as fs from 'fs'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

const DELAY_BETWEEN_QUERIES_MS = 10000 // 10s between queries (worldwide = more load)
const MAX_RETRIES = 4
const RETRY_DELAY_MS = 30000

// ─── Region definitions ─────────────────────────────────────────────────

interface Country {
  name: string
  iso: string
  slug: string
  region: string
}

interface BBox {
  name: string
  slug: string
  region: string
  country: string
  bbox: [number, number, number, number] // [south, west, north, east]
}

// ISO-code based countries (smaller, single Overpass area query)
const COUNTRIES: Country[] = [
  // ─── North America ───
  { name: 'Canada', iso: 'CA', slug: 'canada', region: 'north-america' },
  { name: 'Mexico', iso: 'MX', slug: 'mexico', region: 'north-america' },
  { name: 'Costa Rica', iso: 'CR', slug: 'costa-rica', region: 'north-america' },
  { name: 'Guatemala', iso: 'GT', slug: 'guatemala', region: 'north-america' },
  { name: 'Panama', iso: 'PA', slug: 'panama', region: 'north-america' },
  { name: 'Cuba', iso: 'CU', slug: 'cuba', region: 'north-america' },
  { name: 'Dominican Republic', iso: 'DO', slug: 'dominican-republic', region: 'north-america' },
  { name: 'Jamaica', iso: 'JM', slug: 'jamaica', region: 'north-america' },
  { name: 'Puerto Rico', iso: 'PR', slug: 'puerto-rico', region: 'north-america' },
  { name: 'Trinidad and Tobago', iso: 'TT', slug: 'trinidad-and-tobago', region: 'north-america' },
  { name: 'Honduras', iso: 'HN', slug: 'honduras', region: 'north-america' },
  { name: 'El Salvador', iso: 'SV', slug: 'el-salvador', region: 'north-america' },
  { name: 'Nicaragua', iso: 'NI', slug: 'nicaragua', region: 'north-america' },

  // ─── South America ───
  { name: 'Brazil', iso: 'BR', slug: 'brazil', region: 'south-america' },
  { name: 'Argentina', iso: 'AR', slug: 'argentina', region: 'south-america' },
  { name: 'Colombia', iso: 'CO', slug: 'colombia', region: 'south-america' },
  { name: 'Chile', iso: 'CL', slug: 'chile', region: 'south-america' },
  { name: 'Peru', iso: 'PE', slug: 'peru', region: 'south-america' },
  { name: 'Ecuador', iso: 'EC', slug: 'ecuador', region: 'south-america' },
  { name: 'Uruguay', iso: 'UY', slug: 'uruguay', region: 'south-america' },
  { name: 'Bolivia', iso: 'BO', slug: 'bolivia', region: 'south-america' },
  { name: 'Paraguay', iso: 'PY', slug: 'paraguay', region: 'south-america' },
  { name: 'Venezuela', iso: 'VE', slug: 'venezuela', region: 'south-america' },

  // ─── Asia ───
  { name: 'Japan', iso: 'JP', slug: 'japan', region: 'asia' },
  { name: 'South Korea', iso: 'KR', slug: 'south-korea', region: 'asia' },
  { name: 'Taiwan', iso: 'TW', slug: 'taiwan', region: 'asia' },
  { name: 'Thailand', iso: 'TH', slug: 'thailand', region: 'asia' },
  { name: 'Vietnam', iso: 'VN', slug: 'vietnam', region: 'asia' },
  { name: 'Indonesia', iso: 'ID', slug: 'indonesia', region: 'asia' },
  { name: 'Malaysia', iso: 'MY', slug: 'malaysia', region: 'asia' },
  { name: 'Singapore', iso: 'SG', slug: 'singapore', region: 'asia' },
  { name: 'Philippines', iso: 'PH', slug: 'philippines', region: 'asia' },
  { name: 'Cambodia', iso: 'KH', slug: 'cambodia', region: 'asia' },
  { name: 'Sri Lanka', iso: 'LK', slug: 'sri-lanka', region: 'asia' },
  { name: 'Nepal', iso: 'NP', slug: 'nepal', region: 'asia' },
  { name: 'Israel', iso: 'IL', slug: 'israel', region: 'asia' },
  { name: 'Turkey', iso: 'TR', slug: 'turkey', region: 'asia' },
  { name: 'United Arab Emirates', iso: 'AE', slug: 'uae', region: 'asia' },
  { name: 'Lebanon', iso: 'LB', slug: 'lebanon', region: 'asia' },
  { name: 'Georgia', iso: 'GE', slug: 'georgia', region: 'asia' },

  // ─── Oceania ───
  { name: 'Australia', iso: 'AU', slug: 'australia', region: 'oceania' },
  { name: 'New Zealand', iso: 'NZ', slug: 'new-zealand', region: 'oceania' },

  // ─── Africa ───
  { name: 'South Africa', iso: 'ZA', slug: 'south-africa', region: 'africa' },
  { name: 'Morocco', iso: 'MA', slug: 'morocco', region: 'africa' },
  { name: 'Kenya', iso: 'KE', slug: 'kenya', region: 'africa' },
  { name: 'Egypt', iso: 'EG', slug: 'egypt', region: 'africa' },
  { name: 'Nigeria', iso: 'NG', slug: 'nigeria', region: 'africa' },
  { name: 'Tanzania', iso: 'TZ', slug: 'tanzania', region: 'africa' },
  { name: 'Ghana', iso: 'GH', slug: 'ghana', region: 'africa' },
  { name: 'Ethiopia', iso: 'ET', slug: 'ethiopia', region: 'africa' },
  { name: 'Tunisia', iso: 'TN', slug: 'tunisia', region: 'africa' },
  { name: 'Senegal', iso: 'SN', slug: 'senegal', region: 'africa' },
]

// Bounding box queries for very large countries (split to avoid Overpass timeouts)
const BBOX_QUERIES: BBox[] = [
  // ─── USA (split into 4 quadrants) ───
  { name: 'USA — West', slug: 'usa', region: 'north-america', country: 'United States', bbox: [25, -125, 49, -100] },
  { name: 'USA — Central', slug: 'usa', region: 'north-america', country: 'United States', bbox: [25, -100, 49, -85] },
  { name: 'USA — East', slug: 'usa', region: 'north-america', country: 'United States', bbox: [25, -85, 49, -65] },
  { name: 'USA — Alaska+Hawaii', slug: 'usa', region: 'north-america', country: 'United States', bbox: [18, -180, 72, -125] },

  // ─── India (split into north/south) ───
  { name: 'India — North', slug: 'india', region: 'asia', country: 'India', bbox: [20, 68, 36, 98] },
  { name: 'India — South', slug: 'india', region: 'asia', country: 'India', bbox: [6, 68, 20, 98] },

  // ─── China (split) ───
  { name: 'China — East', slug: 'china', region: 'asia', country: 'China', bbox: [18, 100, 54, 135] },
  { name: 'China — West', slug: 'china', region: 'asia', country: 'China', bbox: [25, 73, 54, 100] },
]

// ─── Types ──────────────────────────────────────────────────────────────

interface OSMElement {
  type: 'node' | 'way'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface ImportPlace {
  name: string
  description: string | null
  category: 'eat' | 'store' | 'hotel' | 'other'
  address: string
  latitude: number
  longitude: number
  city: string | null
  country: string
  website: string | null
  phone: string | null
  is_pet_friendly: boolean
  images: string[]
  tags: string[]
  source: string
  source_id: string
  opening_hours: string | null
  cuisine_types: string[]
  vegan_level: 'fully_vegan' | 'vegan_friendly'
}

// ─── Helpers ────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function mapCategory(tags: Record<string, string>): ImportPlace['category'] {
  const amenity = tags.amenity || ''
  const shop = tags.shop || ''
  const tourism = tags.tourism || ''

  if (shop === 'supermarket' || shop === 'convenience' || shop === 'health_food' ||
      shop === 'organic' || shop === 'grocery' || shop === 'bakery' ||
      shop === 'deli' || shop === 'greengrocer') {
    return 'store'
  }
  if (tourism === 'hotel' || tourism === 'hostel' || tourism === 'guest_house' ||
      tourism === 'motel' || tourism === 'apartment') {
    return 'hotel'
  }
  if (amenity === 'restaurant' || amenity === 'cafe' || amenity === 'fast_food' ||
      amenity === 'bar' || amenity === 'pub' || amenity === 'ice_cream' ||
      amenity === 'food_court' || amenity === 'biergarten') {
    return 'eat'
  }
  if (shop) return 'store'
  return 'eat'
}

function buildAddress(tags: Record<string, string>, country: string): string {
  const parts = [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:city'] || tags['addr:town'] || tags['addr:village'],
    tags['addr:postcode'],
    country,
  ].filter(Boolean)
  return parts.join(', ') || country
}

function buildDescription(tags: Record<string, string>): string | null {
  const parts: string[] = []
  if (tags.description) parts.push(tags.description)
  if (tags.cuisine) parts.push(`Cuisine: ${tags.cuisine.replace(/;/g, ', ')}`)
  if (tags.note) parts.push(tags.note)
  return parts.length > 0 ? parts.join('. ') : null
}

function extractTags(tags: Record<string, string>): string[] {
  const result: string[] = ['vegan']
  if (tags.cuisine) {
    tags.cuisine.split(';').forEach(c => {
      const trimmed = c.trim().toLowerCase()
      if (trimmed && !result.includes(trimmed)) result.push(trimmed)
    })
  }
  if (tags.organic === 'yes' || tags.organic === 'only') result.push('organic')
  if (tags['diet:gluten_free'] === 'yes') result.push('gluten-free')
  if (tags['diet:raw'] === 'yes') result.push('raw')
  return result
}

// ─── Overpass queries with endpoint rotation and retry ───────────────────

let endpointIndex = 0

function nextEndpoint(): string {
  const ep = OVERPASS_ENDPOINTS[endpointIndex % OVERPASS_ENDPOINTS.length]
  endpointIndex++
  return ep
}

async function runOverpassQuery(query: string, label: string): Promise<OSMElement[]> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const endpoint = nextEndpoint()
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'PlantsPack/1.0 (+https://plantspack.com)',
        },
        signal: AbortSignal.timeout(120000),
      })

      if (!response.ok) {
        const text = await response.text()
        if (text.includes('too busy') || text.includes('timeout') || text.includes('runtime error')) {
          console.warn(`  ⚠️  ${label}: server busy (${endpoint.split('//')[1].split('/')[0]}), retry ${attempt + 1}/${MAX_RETRIES}...`)
          await sleep(RETRY_DELAY_MS + attempt * 15000)
          continue
        }
        console.error(`  ❌ HTTP ${response.status} for ${label}`)
        return []
      }

      const data = await response.json()
      return data.elements || []
    } catch (error) {
      const msg = (error as Error).message
      if (msg.includes('abort') || msg.includes('timeout')) {
        console.warn(`  ⚠️  ${label}: timeout (${endpoint.split('//')[1].split('/')[0]}), retry ${attempt + 1}/${MAX_RETRIES}...`)
      } else {
        console.warn(`  ⚠️  ${label}: ${msg}, retry ${attempt + 1}/${MAX_RETRIES}...`)
      }
      await sleep(RETRY_DELAY_MS + attempt * 15000)
    }
  }
  console.error(`  ❌ Failed for ${label} after ${MAX_RETRIES} retries`)
  return []
}

// ─── Process OSM elements ───────────────────────────────────────────────

function processElements(elements: OSMElement[], countryName: string): ImportPlace[] {
  const places: ImportPlace[] = []
  let skipped = 0

  for (const el of elements) {
    const tags = el.tags || {}
    const name = tags.name || tags['name:en']
    if (!name) { skipped++; continue }

    const lat = el.lat || el.center?.lat
    const lon = el.lon || el.center?.lon
    if (!lat || !lon) { skipped++; continue }

    const isFullyVegan = tags['diet:vegan'] === 'only'
    const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || null

    places.push({
      name,
      description: buildDescription(tags),
      category: mapCategory(tags),
      address: buildAddress(tags, countryName),
      latitude: lat,
      longitude: lon,
      city,
      country: countryName,
      website: tags.website || tags['contact:website'] || null,
      phone: tags.phone || tags['contact:phone'] || null,
      is_pet_friendly: tags.dog === 'yes' || tags.pets === 'yes',
      images: [],
      tags: extractTags(tags),
      source: 'openstreetmap',
      source_id: `osm:${el.type}/${el.id}`,
      opening_hours: tags.opening_hours || null,
      cuisine_types: tags.cuisine ? tags.cuisine.split(';').map(c => c.trim()) : [],
      vegan_level: isFullyVegan ? 'fully_vegan' : 'vegan_friendly',
    })
  }

  return places
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const regionFilter = args.find(a => a.startsWith('--region='))?.split('=')[1] || null
  const countryFilter = args.find(a => a.startsWith('--country='))?.split('=')[1] || null
  const outputFile = args.find(a => a.startsWith('--output='))?.split('=')[1] || 'scripts/osm-worldwide-vegan-places.json'
  const onlyVeganOnly = args.includes('--only-vegan-only')
  const shouldResume = args.includes('--resume')
  const checkpointFile = 'scripts/osm-worldwide-checkpoint.json'

  console.log('🌍 OSM Vegan Places Import — WORLDWIDE')
  console.log('========================================')
  console.log(`Output: ${outputFile}`)
  if (regionFilter) console.log(`Region filter: ${regionFilter}`)
  if (countryFilter) console.log(`Country filter: ${countryFilter}`)
  if (onlyVeganOnly) console.log('Filter: Only diet:vegan=only (fully vegan)')
  console.log()

  // Filter queries by region/country
  let countries = COUNTRIES
  let bboxes = BBOX_QUERIES

  if (regionFilter) {
    countries = countries.filter(c => c.region === regionFilter)
    bboxes = bboxes.filter(b => b.region === regionFilter)
  }
  if (countryFilter) {
    countries = countries.filter(c => c.slug === countryFilter || c.name.toLowerCase() === countryFilter.toLowerCase())
    bboxes = bboxes.filter(b => b.slug === countryFilter || b.country.toLowerCase() === countryFilter.toLowerCase())
  }

  const totalQueries = countries.length + bboxes.length
  console.log(`Total queries: ${totalQueries} (${countries.length} ISO + ${bboxes.length} bbox)`)

  // Resume support
  let allPlaces: ImportPlace[] = []
  let completedQueries = new Set<string>()

  if (shouldResume && fs.existsSync(checkpointFile)) {
    const cp = JSON.parse(fs.readFileSync(checkpointFile, 'utf-8'))
    allPlaces = cp.places || []
    completedQueries = new Set(cp.completedQueries || [])
    console.log(`📂 Resumed: ${allPlaces.length} places from ${completedQueries.size} completed queries\n`)
  }

  // Process ISO countries
  let queryNum = 0
  for (const country of countries) {
    queryNum++
    const queryKey = `iso:${country.iso}`
    if (completedQueries.has(queryKey)) {
      console.log(`  ⏭️  [${queryNum}/${totalQueries}] ${country.name} (cached)`)
      continue
    }

    console.log(`\n🔍 [${queryNum}/${totalQueries}] ${country.name} (${country.region})...`)
    const query = `[out:json][timeout:180];area["ISO3166-1"="${country.iso}"]->.searchArea;(node["diet:vegan"~"yes|only"](area.searchArea);way["diet:vegan"~"yes|only"](area.searchArea););out body center;`
    const elements = await runOverpassQuery(query, country.name)
    const places = processElements(elements, country.name)
    allPlaces.push(...places)
    completedQueries.add(queryKey)
    console.log(`  ✅ ${country.name}: ${places.length} places`)

    // Save checkpoint every 5 queries
    if (queryNum % 5 === 0) {
      saveCheckpoint(checkpointFile, allPlaces, completedQueries)
    }

    await sleep(DELAY_BETWEEN_QUERIES_MS)
  }

  // Process bbox queries (large countries split into sub-regions)
  for (const box of bboxes) {
    queryNum++
    const queryKey = `bbox:${box.name}`
    if (completedQueries.has(queryKey)) {
      console.log(`  ⏭️  [${queryNum}/${totalQueries}] ${box.name} (cached)`)
      continue
    }

    console.log(`\n🔍 [${queryNum}/${totalQueries}] ${box.name} (${box.region})...`)
    const [s, w, n, e] = box.bbox
    const query = `[out:json][timeout:180];(node["diet:vegan"~"yes|only"](${s},${w},${n},${e});way["diet:vegan"~"yes|only"](${s},${w},${n},${e}););out body center;`
    const elements = await runOverpassQuery(query, box.name)
    const places = processElements(elements, box.country)
    allPlaces.push(...places)
    completedQueries.add(queryKey)
    console.log(`  ✅ ${box.name}: ${places.length} places`)

    if (queryNum % 5 === 0) {
      saveCheckpoint(checkpointFile, allPlaces, completedQueries)
    }

    await sleep(DELAY_BETWEEN_QUERIES_MS)
  }

  // Filter
  if (onlyVeganOnly) {
    const before = allPlaces.length
    allPlaces = allPlaces.filter(p => p.vegan_level === 'fully_vegan')
    console.log(`\nFiltered: ${before} → ${allPlaces.length} (only fully vegan)`)
  }

  // Deduplicate by source_id
  const seen = new Set<string>()
  allPlaces = allPlaces.filter(p => {
    if (seen.has(p.source_id)) return false
    seen.add(p.source_id)
    return true
  })

  // Sort
  allPlaces.sort((a, b) =>
    a.country.localeCompare(b.country) ||
    (a.city || '').localeCompare(b.city || '') ||
    a.name.localeCompare(b.name)
  )

  // Summary
  console.log('\n\n📊 SUMMARY BY REGION')
  console.log('=====================')
  const byRegion: Record<string, number> = {}
  const regionMap: Record<string, string> = {}
  for (const c of COUNTRIES) regionMap[c.name] = c.region
  for (const b of BBOX_QUERIES) regionMap[b.country] = b.region
  for (const p of allPlaces) {
    const region = regionMap[p.country] || 'unknown'
    byRegion[region] = (byRegion[region] || 0) + 1
  }
  Object.entries(byRegion).sort((a, b) => b[1] - a[1]).forEach(([r, c]) => console.log(`  ${r}: ${c.toLocaleString()}`))

  console.log('\n📊 SUMMARY BY COUNTRY')
  console.log('=====================')
  const byCountry: Record<string, number> = {}
  for (const p of allPlaces) byCountry[p.country] = (byCountry[p.country] || 0) + 1
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n.toLocaleString()}`))

  const fullyVegan = allPlaces.filter(p => p.vegan_level === 'fully_vegan').length
  const withWebsite = allPlaces.filter(p => p.website).length
  const withCity = allPlaces.filter(p => p.city).length

  console.log('\n📊 DATA QUALITY')
  console.log(`  Total: ${allPlaces.length.toLocaleString()}`)
  console.log(`  Fully vegan: ${fullyVegan.toLocaleString()} (${(fullyVegan / allPlaces.length * 100).toFixed(1)}%)`)
  console.log(`  With website: ${withWebsite.toLocaleString()} (${(withWebsite / allPlaces.length * 100).toFixed(1)}%)`)
  console.log(`  With city: ${withCity.toLocaleString()} (${(withCity / allPlaces.length * 100).toFixed(1)}%)`)

  // Write output
  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'OpenStreetMap (Overpass API)',
      filter: 'diet:vegan=yes OR diet:vegan=only',
      regions: [...new Set(Object.values(regionMap))],
      totalPlaces: allPlaces.length,
      totalCountries: Object.keys(byCountry).length,
      byRegion,
      byCountry,
    },
    places: allPlaces,
  }

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2))
  console.log(`\n✅ Written ${allPlaces.length.toLocaleString()} places to ${outputFile}`)
  console.log(`   File size: ${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(1)} MB`)

  // Clean up checkpoint
  if (fs.existsSync(checkpointFile)) {
    fs.unlinkSync(checkpointFile)
    console.log('   Checkpoint cleaned up')
  }
}

function saveCheckpoint(file: string, places: ImportPlace[], completed: Set<string>) {
  fs.writeFileSync(file, JSON.stringify({
    timestamp: new Date().toISOString(),
    places,
    completedQueries: [...completed],
  }))
  console.log(`  💾 Checkpoint: ${places.length} places, ${completed.size} queries done`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
