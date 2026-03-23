/**
 * OSM Vegan Places Import Pipeline for Europe + UK + Ukraine
 *
 * Extracts fully vegan places from OpenStreetMap via Overpass API,
 * enriches with city/country data, and outputs import-ready JSON.
 *
 * Only includes places tagged as diet:vegan=yes or diet:vegan=only.
 *
 * Usage:
 *   npx tsx scripts/import-osm-europe.ts
 *   npx tsx scripts/import-osm-europe.ts --country germany
 *   npx tsx scripts/import-osm-europe.ts --verify --min-score 50
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import * as fs from 'fs'

const OVERPASS_API = 'https://overpass-api.de/api/interpreter'
const DELAY_BETWEEN_QUERIES_MS = 6000 // Be gentle with Overpass

// EU countries + UK + Ukraine with their OSM name tags
// Use ISO country codes for reliable Overpass area lookups
const COUNTRIES: { name: string; iso: string; slug: string }[] = [
  { name: 'Germany', iso: 'DE', slug: 'germany' },
  { name: 'France', iso: 'FR', slug: 'france' },
  { name: 'United Kingdom', iso: 'GB', slug: 'united-kingdom' },
  { name: 'Netherlands', iso: 'NL', slug: 'netherlands' },
  { name: 'Italy', iso: 'IT', slug: 'italy' },
  { name: 'Spain', iso: 'ES', slug: 'spain' },
  { name: 'Poland', iso: 'PL', slug: 'poland' },
  { name: 'Belgium', iso: 'BE', slug: 'belgium' },
  { name: 'Sweden', iso: 'SE', slug: 'sweden' },
  { name: 'Austria', iso: 'AT', slug: 'austria' },
  { name: 'Czech Republic', iso: 'CZ', slug: 'czech-republic' },
  { name: 'Portugal', iso: 'PT', slug: 'portugal' },
  { name: 'Denmark', iso: 'DK', slug: 'denmark' },
  { name: 'Finland', iso: 'FI', slug: 'finland' },
  { name: 'Ireland', iso: 'IE', slug: 'ireland' },
  { name: 'Greece', iso: 'GR', slug: 'greece' },
  { name: 'Romania', iso: 'RO', slug: 'romania' },
  { name: 'Hungary', iso: 'HU', slug: 'hungary' },
  { name: 'Croatia', iso: 'HR', slug: 'croatia' },
  { name: 'Slovakia', iso: 'SK', slug: 'slovakia' },
  { name: 'Slovenia', iso: 'SI', slug: 'slovenia' },
  { name: 'Lithuania', iso: 'LT', slug: 'lithuania' },
  { name: 'Latvia', iso: 'LV', slug: 'latvia' },
  { name: 'Estonia', iso: 'EE', slug: 'estonia' },
  { name: 'Bulgaria', iso: 'BG', slug: 'bulgaria' },
  { name: 'Luxembourg', iso: 'LU', slug: 'luxembourg' },
  { name: 'Norway', iso: 'NO', slug: 'norway' },
  { name: 'Switzerland', iso: 'CH', slug: 'switzerland' },
  { name: 'Ukraine', iso: 'UA', slug: 'ukraine' },
]

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
  return 'eat' // Default for vegan-tagged places
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Bounding boxes for large countries that need splitting
const LARGE_COUNTRY_BOXES: Record<string, [number, number, number, number][]> = {
  DE: [ // Germany split into north/south
    [47.2, 5.8, 51.5, 15.1], // South
    [51.5, 5.8, 55.1, 15.1], // North
  ],
  FR: [ // France split into north/south
    [42.3, -5.2, 46.0, 8.3], // South
    [46.0, -5.2, 51.1, 8.3], // North
  ],
  GB: [ // UK split into England/Scotland
    [49.9, -8.2, 53.5, 2.0], // South England
    [53.5, -8.2, 61.0, 2.0], // North + Scotland
  ],
  IT: [ // Italy split into north/south
    [36.6, 6.6, 42.5, 18.6], // South
    [42.5, 6.6, 47.1, 18.6], // North
  ],
  ES: [ // Spain split into north/south
    [36.0, -9.3, 40.0, 4.4], // South
    [40.0, -9.3, 43.8, 4.4], // North
  ],
}

async function runOverpassQuery(query: string, label: string): Promise<OSMElement[]> {
  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    if (!response.ok) {
      const text = await response.text()
      if (text.includes('too busy') || text.includes('timeout')) {
        console.warn(`  ⚠️  Overpass busy/timeout for ${label}, retrying in 30s...`)
        await sleep(30000)
        const retry = await fetch(OVERPASS_API, {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        if (!retry.ok) {
          console.error(`  ❌ Failed for ${label} after retry`)
          return []
        }
        const retryData = await retry.json()
        return retryData.elements || []
      }
      console.error(`  ❌ HTTP ${response.status} for ${label}`)
      return []
    }

    const data = await response.json()
    return data.elements || []
  } catch (error) {
    console.error(`  ❌ Error for ${label}:`, (error as Error).message)
    return []
  }
}

async function fetchCountryPlaces(country: typeof COUNTRIES[0]): Promise<ImportPlace[]> {
  console.log(`\n🔍 Fetching vegan places in ${country.name}...`)

  const boxes = LARGE_COUNTRY_BOXES[country.iso]

  if (boxes) {
    // Split into bounding box sub-queries for large countries
    let allElements: OSMElement[] = []
    for (let i = 0; i < boxes.length; i++) {
      const [s, w, n, e] = boxes[i]
      const query = `[out:json][timeout:180];(node["diet:vegan"~"yes|only"](${s},${w},${n},${e});way["diet:vegan"~"yes|only"](${s},${w},${n},${e}););out body center;`
      console.log(`  📦 Sub-region ${i + 1}/${boxes.length}...`)
      const elements = await runOverpassQuery(query, `${country.name} part ${i + 1}`)
      allElements.push(...elements)
      if (i < boxes.length - 1) await sleep(DELAY_BETWEEN_QUERIES_MS)
    }
    return processElements(allElements, country)
  }

  // Standard single-query for smaller countries
  const query = `[out:json][timeout:180];area["ISO3166-1"="${country.iso}"]->.searchArea;(node["diet:vegan"~"yes|only"](area.searchArea);way["diet:vegan"~"yes|only"](area.searchArea););out body center;`
  const elements = await runOverpassQuery(query, country.name)
  return processElements(elements, country)
}

function processElements(elements: OSMElement[], country: typeof COUNTRIES[0]): ImportPlace[] {
  const places: ImportPlace[] = []
  let skipped = 0

  for (const el of elements) {
    const tags = el.tags || {}
    const name = tags.name
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
      address: buildAddress(tags, country.name),
      latitude: lat,
      longitude: lon,
      city,
      country: country.name,
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

  console.log(`  ✅ ${country.name}: ${places.length} places (${skipped} skipped — no name/coords)`)
  return places
}

async function main() {
  const args = process.argv.slice(2)
  const singleCountry = args.find(a => a.startsWith('--country='))?.split('=')[1] ||
    (args.includes('--country') ? args[args.indexOf('--country') + 1] : null)
  const outputFile = args.find(a => a.startsWith('--output='))?.split('=')[1] || 'osm-europe-vegan-places.json'
  const onlyVeganOnly = args.includes('--only-vegan-only')

  console.log('🌿 OSM Vegan Places Import — Europe + UK + Ukraine')
  console.log('===================================================')
  console.log(`Output: ${outputFile}`)
  if (singleCountry) console.log(`Country filter: ${singleCountry}`)
  if (onlyVeganOnly) console.log('Filter: Only diet:vegan=only (fully vegan)')
  console.log()

  const countries = singleCountry
    ? COUNTRIES.filter(c => c.slug === singleCountry || c.name.toLowerCase() === singleCountry.toLowerCase())
    : COUNTRIES

  if (countries.length === 0) {
    console.error(`Country not found: ${singleCountry}`)
    console.log('Available:', COUNTRIES.map(c => c.slug).join(', '))
    process.exit(1)
  }

  let allPlaces: ImportPlace[] = []

  for (let i = 0; i < countries.length; i++) {
    const places = await fetchCountryPlaces(countries[i])
    allPlaces.push(...places)

    // Rate limiting between countries
    if (i < countries.length - 1) {
      console.log(`  ⏳ Waiting ${DELAY_BETWEEN_QUERIES_MS / 1000}s before next country...`)
      await sleep(DELAY_BETWEEN_QUERIES_MS)
    }
  }

  // Filter for fully vegan only if requested
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

  // Sort by country, then city, then name
  allPlaces.sort((a, b) => {
    const countryCompare = a.country.localeCompare(b.country)
    if (countryCompare !== 0) return countryCompare
    const cityCompare = (a.city || '').localeCompare(b.city || '')
    if (cityCompare !== 0) return cityCompare
    return a.name.localeCompare(b.name)
  })

  // Summary by country
  console.log('\n\n📊 SUMMARY BY COUNTRY')
  console.log('======================')
  const byCountry: Record<string, number> = {}
  for (const p of allPlaces) {
    byCountry[p.country] = (byCountry[p.country] || 0) + 1
  }
  Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1])
    .forEach(([country, count]) => {
      console.log(`  ${country}: ${count.toLocaleString()}`)
    })

  // Summary by category
  console.log('\n📊 SUMMARY BY CATEGORY')
  const byCat: Record<string, number> = {}
  for (const p of allPlaces) {
    byCat[p.category] = (byCat[p.category] || 0) + 1
  }
  Object.entries(byCat).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count.toLocaleString()}`)
  })

  // Data quality stats
  const withWebsite = allPlaces.filter(p => p.website).length
  const withPhone = allPlaces.filter(p => p.phone).length
  const withCity = allPlaces.filter(p => p.city).length
  const withHours = allPlaces.filter(p => p.opening_hours).length
  const fullyVegan = allPlaces.filter(p => p.vegan_level === 'fully_vegan').length

  console.log('\n📊 DATA QUALITY')
  console.log(`  Total: ${allPlaces.length.toLocaleString()}`)
  console.log(`  Fully vegan (diet:vegan=only): ${fullyVegan.toLocaleString()} (${(fullyVegan/allPlaces.length*100).toFixed(1)}%)`)
  console.log(`  With website: ${withWebsite.toLocaleString()} (${(withWebsite/allPlaces.length*100).toFixed(1)}%)`)
  console.log(`  With phone: ${withPhone.toLocaleString()} (${(withPhone/allPlaces.length*100).toFixed(1)}%)`)
  console.log(`  With city: ${withCity.toLocaleString()} (${(withCity/allPlaces.length*100).toFixed(1)}%)`)
  console.log(`  With opening hours: ${withHours.toLocaleString()} (${(withHours/allPlaces.length*100).toFixed(1)}%)`)

  // Write output
  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: 'OpenStreetMap (Overpass API)',
      filter: 'diet:vegan=yes OR diet:vegan=only',
      regions: countries.map(c => c.name),
      totalPlaces: allPlaces.length,
      totalCountries: Object.keys(byCountry).length,
    },
    places: allPlaces,
  }

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2))
  console.log(`\n✅ Written ${allPlaces.length.toLocaleString()} places to ${outputFile}`)
  console.log(`   File size: ${(fs.statSync(outputFile).size / 1024 / 1024).toFixed(1)} MB`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
