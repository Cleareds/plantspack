// Weekly OSM sync.
//
// TWO outputs:
//  1) Report (always): every NEW vegan/vegan-friendly OSM place from the last
//     ~9 days -> candidate list uploaded to Supabase Storage (backups/osm-sync/).
//  2) Auto-import (Option A, only with --import): the HIGH-SIGNAL slice is
//     inserted live-but-unverified. High-signal = diet:vegan=only OR cuisine=vegan,
//     non-chain, with coordinates. Everything else stays report-only for a human.
//
// Safety (per CLAUDE.md):
//  - Never fully_vegan from an OSM tag (the Adyar lesson) -> imported as
//    vegan_friendly; a human promotes later.
//  - is_verified=false, verification_status='unverified', verification_method
//    'osm-auto-sync' (descriptive, NEVER admin_review) -> honest "help verify".
//  - Chains excluded (chain policy). source='osm-auto-sync-<date>' so a whole
//    run is reversible:  DELETE FROM places WHERE source LIKE 'osm-auto-sync-%'.
//  - Dedup by source_id AND name+coords against the live DB.
//
// Flags:  --import        perform the auto-import (else report-only, as before)
//         --dry-run       with --import: compute + print the slice, insert nothing
import { createClient } from '@supabase/supabase-js'

const OVERPASS = 'https://overpass-api.de/api/interpreter'
const UA = 'PlantsPack-OSM-sync/1.0 (hello@plantspack.com)'
const ADMIN_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const DO_IMPORT = process.argv.includes('--import') || process.env.OSM_AUTO_IMPORT === '1'
const DRY_RUN = process.argv.includes('--dry-run')
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
// Non-vegan chains we never auto-import (chain policy). vegan/mostly-vegan chains
// are fine, but those are vanishingly rare in the diet:vegan=only slice anyway.
const CHAINS = ['mcdonald', 'domino', 'subway', 'burger king', 'kfc', 'starbucks', 'pizza hut', 'taco bell', "wendy", 'dunkin', 'pizza express', 'papa john', 'five guys', 'chipotle', 'greggs', 'costa coffee', 'pret a manger', 'nando', 'wagamama', 'yo! sushi', 'leon', 'itsu']
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const slugify = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
const isChain = (name) => { const n = (name || '').toLowerCase(); return CHAINS.some((c) => n.includes(c)) }
const catFor = (name) => (/\b(store|shop|grocery|market|bakery|deli|supermarket)\b/i.test(name || '') ? 'store' : 'eat')

async function scrapeRegion(region) {
  const [s, w, n, e] = region.bbox.split(',')
  const since = new Date(Date.now() - 9 * 86400000).toISOString().split('T')[0] + 'T00:00:00Z'
  const body = FILTERS.map((f) => `${f}(newer:"${since}")(${s},${w},${n},${e});`).join('')
  const query = `[out:json][timeout:120];(${body});out center meta;`
  try {
    const res = await fetch(OVERPASS, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA } })
    if (!res.ok) { console.log(`  ${region.name}: HTTP ${res.status}`); return [] }
    const data = await res.json()
    console.log(`  ${region.name}: ${data.elements?.length || 0}`)
    return data.elements || []
  } catch (e) { console.log(`  ${region.name}: ${e?.name || e}`); return [] }
}

// Reverse-geocode missing city/country (Nominatim, 1 req/sec, UA required).
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en&zoom=14`, { headers: { 'User-Agent': UA } })
    if (!res.ok) return {}
    const a = (await res.json())?.address || {}
    return { city: a.city || a.town || a.village || a.municipality || null, country: a.country || null }
  } catch { return {} }
}

;(async () => {
  console.log(`OSM Weekly Sync - fetching new/changed places... (import=${DO_IMPORT} dryRun=${DRY_RUN})`)
  let allElements = []
  for (const region of REGIONS) { allElements.push(...(await scrapeRegion(region))); await sleep(5000) }

  const places = allElements.filter((el) => (el.tags || {}).name).map((el) => {
    const tags = el.tags || {}
    const lat = el.type === 'way' ? el.center?.lat : el.lat
    const lng = el.type === 'way' ? el.center?.lon : el.lon
    if (!lat || !lng) return null
    return {
      name: tags['name:en'] || tags.name,
      latitude: lat,
      longitude: lng,
      vegan_level: tags['diet:vegan'] === 'limited' ? 'vegan_options' : 'vegan_friendly',
      osm_diet_vegan: tags['diet:vegan'] || null,
      cuisine: tags.cuisine || null,
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

  // Dedup against existing DB: name+coords key AND source_id.
  let existing = [], offset = 0
  for (;;) {
    const { data } = await supabase.from('places').select('name, latitude, longitude, source_id').range(offset, offset + 999)
    if (!data || data.length === 0) break
    existing.push(...data); offset += 1000
    if (data.length < 1000) break
  }
  const key = (n, la, lo) => n.toLowerCase() + '|' + Math.round(la * 1000) + '|' + Math.round(lo * 1000)
  const existingKeys = new Set(existing.map((p) => key(p.name, p.latitude, p.longitude)))
  const existingIds = new Set(existing.map((p) => p.source_id).filter(Boolean))
  const newPlaces = places.filter((p) => !existingKeys.has(key(p.name, p.latitude, p.longitude)) && !existingIds.has(p.source_id))
  console.log('New candidate places (not in DB): ' + newPlaces.length)

  // High-signal slice for auto-import: genuinely vegan-focused, non-chain, has coords.
  const highSignal = newPlaces.filter((p) =>
    (p.osm_diet_vegan === 'only' || /vegan/i.test(p.cuisine || '')) && !isChain(p.name) && p.latitude && p.longitude)
  console.log(`High-signal (diet:vegan=only / cuisine=vegan, non-chain): ${highSignal.length}`)

  let imported = 0, skipped = 0
  if (DO_IMPORT) {
    const today = new Date().toISOString().split('T')[0]
    for (const p of highSignal) {
      let { city, country } = p
      // Reverse-geocode to fill missing country/city only for real inserts;
      // the dry-run just needs the count + a sample, so skip the slow lookups.
      if (!DRY_RUN && (!country || !city)) { const g = await reverseGeocode(p.latitude, p.longitude); city = city || g.city; country = country || g.country; await sleep(1100) }
      if (!DRY_RUN && !country) { console.log(`  skip (no country): ${p.name}`); skipped++; continue }
      // unique slug
      let slug = slugify(`${p.name}-${city || country}`) || slugify(p.name) || p.source_id
      const { data: clash } = await supabase.from('places').select('id').eq('slug', slug).maybeSingle()
      if (clash) slug = `${slug}-${String(p.source_id).replace(/\D/g, '').slice(-5)}`
      const row = {
        name: p.name, latitude: p.latitude, longitude: p.longitude,
        address: p.address || city || country || 'Unknown', city, country,
        category: catFor(p.name), vegan_level: 'vegan_friendly',
        website: p.website, phone: p.phone, opening_hours: p.opening_hours,
        source_id: p.source_id, source: `osm-auto-sync-${today}`, created_by: ADMIN_ID,
        verification_status: 'unverified', verification_method: 'osm-auto-sync', verification_level: 1,
        is_verified: false, slug, tags: ['osm-auto-import'],
      }
      if (DRY_RUN) { console.log(`  WOULD import: ${p.name} | ${city||'?'}, ${country} | ${p.osm_diet_vegan||p.cuisine} -> ${slug}`); imported++; continue }
      const { error } = await supabase.from('places').insert(row)
      if (error) { console.log(`  insert failed (${p.name}): ${error.message}`); skipped++ }
      else { console.log(`  imported: ${p.name} -> /place/${slug}`); imported++ }
    }
    console.log(`${DRY_RUN ? '[dry-run] would import' : 'Imported'} ${imported}, skipped ${skipped}`)
  }

  const report = {
    date: new Date().toISOString(),
    osmTotal: allElements.length, parsed: places.length, newPlaces: newPlaces.length,
    highSignal: highSignal.length, autoImported: DRY_RUN ? 0 : imported, autoSkipped: skipped,
    importEnabled: DO_IMPORT && !DRY_RUN,
    candidates: newPlaces.slice(0, 200),
  }
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  await supabase.storage.from('backups').upload('osm-sync/report-' + new Date().toISOString().split('T')[0] + '.json', blob, { upsert: true })
  console.log('Report saved to Supabase Storage. Done!')
})()
