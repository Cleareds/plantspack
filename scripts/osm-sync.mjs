// Weekly OSM sync — reports NEW vegan/vegan-friendly OSM places (last ~9 days)
// as candidates to Supabase Storage (does NOT auto-insert). Read + storage only.
//
// Fixes vs the old inline version:
//  - User-Agent header: overpass-api.de's WAF returns 406 to Node's default UA,
//    so the job had been silently reporting 0 every week.
//  - Expanded, WAF-safe tag set (avoid the 3-alternation regex): diet:vegan
//    yes|only + exact =limited + cuisine=vegan.
//  - Conservative vegan_level: never fully_vegan from an OSM tag (the Adyar
//    Ananda Bhavan lesson) — limited -> vegan_options, everything else
//    vegan_friendly; a human promotes to fully_vegan via review.
import { createClient } from '@supabase/supabase-js'

const OVERPASS = 'https://overpass-api.de/api/interpreter'
const UA = 'PlantsPack-OSM-sync/1.0 (hello@plantspack.com)'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const REGIONS = [
  { name: 'Europe-West', bbox: '36,-11,60,25' },
  { name: 'Europe-East', bbox: '36,25,72,60' },
  { name: 'North-America', bbox: '15,-170,72,-50' },
  { name: 'South-America', bbox: '-56,-82,15,-34' },
  { name: 'Asia-West', bbox: '10,25,55,80' },
  { name: 'Asia-East', bbox: '-10,80,55,180' },
  { name: 'Africa', bbox: '-35,-20,37,52' },
  { name: 'Oceania', bbox: '-50,110,0,180' },
]
// WAF-safe filters (no 3-alternation regex).
const FILTERS = [
  'node["diet:vegan"~"yes|only"]', 'way["diet:vegan"~"yes|only"]',
  'node["diet:vegan"="limited"]', 'way["diet:vegan"="limited"]',
  'node["cuisine"~"vegan"]', 'way["cuisine"~"vegan"]',
]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function scrapeRegion(region) {
  const [s, w, n, e] = region.bbox.split(',')
  const since = new Date(Date.now() - 9 * 86400000).toISOString().split('T')[0] + 'T00:00:00Z'
  const body = FILTERS.map((f) => `${f}(newer:"${since}")(${s},${w},${n},${e});`).join('')
  const query = `[out:json][timeout:120];(${body});out center meta;`
  try {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    })
    if (!res.ok) { console.log(`  ${region.name}: HTTP ${res.status}`); return [] }
    const data = await res.json()
    console.log(`  ${region.name}: ${data.elements?.length || 0}`)
    return data.elements || []
  } catch (e) { console.log(`  ${region.name}: ${e?.name || e}`); return [] }
}

;(async () => {
  console.log('OSM Weekly Sync - fetching new/changed places...')
  let allElements = []
  for (const region of REGIONS) {
    allElements.push(...(await scrapeRegion(region)))
    await sleep(5000)
  }

  const places = allElements.filter((el) => (el.tags || {}).name).map((el) => {
    const tags = el.tags || {}
    const lat = el.type === 'way' ? el.center?.lat : el.lat
    const lng = el.type === 'way' ? el.center?.lon : el.lon
    if (!lat || !lng) return null
    return {
      name: tags['name:en'] || tags.name,
      latitude: lat,
      longitude: lng,
      // Conservative: never fully_vegan straight from an OSM tag.
      vegan_level: tags['diet:vegan'] === 'limited' ? 'vegan_options' : 'vegan_friendly',
      osm_diet_vegan: tags['diet:vegan'] || null, // so a reviewer can see 'only' claims
      website: tags.website || tags['contact:website'] || null,
      phone: tags.phone || tags['contact:phone'] || null,
      opening_hours: tags.opening_hours || null,
      address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(', ') || null,
      city: tags['addr:city'] || null,
      country: tags['addr:country'] || null,
      source_id: `osm-${el.type}-${el.id}`,
    }
  }).filter(Boolean)
  console.log('Parsed ' + places.length + ' places with names')

  // Dedup against existing DB (crude name+coords key, matching the prior job).
  let existing = [], offset = 0
  for (;;) {
    const { data } = await supabase.from('places').select('name, latitude, longitude').range(offset, offset + 999)
    if (!data || data.length === 0) break
    existing.push(...data); offset += 1000
    if (data.length < 1000) break
  }
  const key = (n, la, lo) => n.toLowerCase() + '|' + Math.round(la * 1000) + '|' + Math.round(lo * 1000)
  const existingSet = new Set(existing.map((p) => key(p.name, p.latitude, p.longitude)))
  const newPlaces = places.filter((p) => !existingSet.has(key(p.name, p.latitude, p.longitude)))
  console.log('New candidate places (not in DB): ' + newPlaces.length)

  const report = {
    date: new Date().toISOString(),
    osmTotal: allElements.length,
    parsed: places.length,
    newPlaces: newPlaces.length,
    candidates: newPlaces.slice(0, 200),
  }
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  await supabase.storage.from('backups').upload('osm-sync/report-' + new Date().toISOString().split('T')[0] + '.json', blob, { upsert: true })
  console.log('Report saved to Supabase Storage. Done!')
})()
