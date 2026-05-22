import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const ENDPOINT = 'https://overpass-api.de/api/interpreter'

async function osmQuery(country_iso) {
  const q = `
[out:json][timeout:60];
area["ISO3166-1"="${country_iso}"][admin_level=2];
(
  node["diet:vegan"="only"](area);
  way["diet:vegan"="only"](area);
);
out center tags;`
  const body = new URLSearchParams({ data: q })
  const res = await fetch(ENDPOINT, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'plantspack-data-quality/1.0' } })
  if (!res.ok) throw new Error(`overpass ${res.status}`)
  return await res.json()
}

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

async function fetchOurPlaces(country) {
  const rows = []
  let from = 0
  while (true) {
    const { data } = await sb.from('places').select('id,name,city,source_id,vegan_level').eq('country', country).is('archived_at', null).range(from, from + 999)
    if (!data?.length) break
    rows.push(...data); if (data.length < 1000) break; from += 1000
  }
  return rows
}

const results = {}
for (const [country, iso] of [['Spain', 'ES'], ['Italy', 'IT']]) {
  console.log(`\n=== ${country} (${iso}) ===`)
  const osm = await osmQuery(iso)
  const candidates = (osm.elements || []).filter(e => e.tags?.name)
  console.log(`  OSM vegan-only candidates: ${candidates.length}`)
  const ours = await fetchOurPlaces(country)
  const ourSourceIds = new Set(ours.map(r => r.source_id).filter(Boolean))
  const ourByName = new Map()
  for (const r of ours) ourByName.set(norm(r.name), r)
  const news = []
  let already = 0
  for (const e of candidates) {
    const id = `osm-${e.type}-${e.id}`
    if (ourSourceIds.has(id)) { already++; continue }
    const nm = norm(e.tags.name)
    if (ourByName.has(nm)) { already++; continue }
    // Filter out obvious non-restaurants
    const amenity = e.tags.amenity
    if (amenity && !['restaurant', 'cafe', 'fast_food', 'pub', 'bar', 'ice_cream'].includes(amenity)) continue
    if (e.tags.shop && !['bakery', 'deli', 'convenience', 'health_food'].includes(e.tags.shop)) continue
    const lat = e.lat || e.center?.lat
    const lon = e.lon || e.center?.lon
    news.push({
      source_id: id,
      name: e.tags.name,
      city: e.tags['addr:city'] || null,
      street: e.tags['addr:street'] || null,
      housenumber: e.tags['addr:housenumber'] || null,
      postcode: e.tags['addr:postcode'] || null,
      phone: e.tags.phone || null,
      website: e.tags.website || e.tags['contact:website'] || null,
      cuisine: e.tags.cuisine || null,
      opening_hours: e.tags.opening_hours || null,
      amenity, lat, lon,
    })
  }
  console.log(`  Already in DB: ${already}`)
  console.log(`  Net new: ${news.length}`)
  results[country] = news
}

const root = 'scripts/seo-out/osm-vegan-only-2026-05-16'
fs.mkdirSync(root, { recursive: true })
fs.writeFileSync(`${root}/candidates.json`, JSON.stringify(results, null, 2))
console.log(`\nWrote ${root}/candidates.json`)
