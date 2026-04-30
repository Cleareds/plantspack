// Pull full OSM data for Denmark + group by city, dedup against our DB,
// and report estimated NEW places per city.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const OVERPASS_API = 'https://overpass-api.de/api/interpreter'
const QUERY = `[out:json][timeout:180];area["ISO3166-1"="DK"]->.s;(node["diet:vegan"~"yes|only"](area.s);way["diet:vegan"~"yes|only"](area.s);node["diet:vegetarian"="only"](area.s);way["diet:vegetarian"="only"](area.s);node["cuisine"="vegan"](area.s);way["cuisine"="vegan"](area.s););out body center;`

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  console.log('Fetching DK OSM data...')
  const resp = await fetch(OVERPASS_API, {
    method: 'POST',
    body: `data=${encodeURIComponent(QUERY)}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'PlantsPack-Coverage-Audit/1.0',
      'Accept': 'application/json',
    },
  })
  const data = await resp.json()
  const els = data.elements || []
  console.log(`OSM elements: ${els.length}`)

  // Pull our existing source_ids for Denmark
  const ourIds = new Set<string>()
  let from = 0
  while (true) {
    const { data: rows } = await sb.from('places')
      .select('source_id, name, latitude, longitude')
      .eq('country', 'Denmark').is('archived_at', null).range(from, from + 999)
    if (!rows || rows.length === 0) break
    for (const r of rows) if (r.source_id) ourIds.add(r.source_id)
    if (rows.length < 1000) break
    from += 1000
  }
  console.log(`Our Denmark source_ids: ${ourIds.size}`)

  // Group OSM by city; flag if already in our DB by source_id
  const cityCounts: Record<string, { total: number; newCount: number; tags: string[] }> = {}
  let dietVegan = 0, dietVegOnly = 0, cuisineVegan = 0
  let chainSkip = 0

  const CHAINS = new Set([
    "mcdonald's","mcdonalds","burger king","kfc","subway","pizza hut","dominos","domino's","papa johns","papa john's",
    "little caesars","taco bell","wendy","wendy's","popeyes","hardees","hardee's","arby's","arbys","dairy queen",
    'pressbyrån','pressbyran','7-eleven','7eleven','ikea restaurang','ikea bistro','biltema cafe','biltema café',
    'pinchos','texas longhorn','steak house','blackstone steakhouse','hesburger','kotipizza',
    "t.g.i. friday's",'fridays','harvester','hungry horse',"nando's",'nandos','max hamburgare','max',
    'pizzabakeren','papa murphys',"papa murphy's",
  ])

  for (const e of els) {
    const tags = e.tags || {}
    if (tags['diet:vegan'] === 'yes' || tags['diet:vegan'] === 'only') dietVegan++
    else if (tags['diet:vegetarian'] === 'only') dietVegOnly++
    else if (tags.cuisine === 'vegan') cuisineVegan++

    const name = (tags.name || '').toLowerCase()
    if (CHAINS.has(name)) { chainSkip++; continue }

    const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags['addr:suburb'] || '(unknown)'
    const sourceId = `osm/${e.type}/${e.id}`
    if (!cityCounts[city]) cityCounts[city] = { total: 0, newCount: 0, tags: [] }
    cityCounts[city].total++
    if (!ourIds.has(sourceId)) cityCounts[city].newCount++
  }

  console.log(`\nOSM tag breakdown:`)
  console.log(`  diet:vegan=yes|only:    ${dietVegan}`)
  console.log(`  diet:vegetarian=only:   ${dietVegOnly}`)
  console.log(`  cuisine=vegan:          ${cuisineVegan}`)
  console.log(`  chain-filter skipped:   ${chainSkip}`)

  console.log(`\nTop cities by NET new (after source_id dedup):`)
  const sorted = Object.entries(cityCounts).sort((a, b) => b[1].newCount - a[1].newCount)
  for (const [city, c] of sorted.slice(0, 25)) {
    console.log(`  ${c.newCount.toString().padStart(4)} new (of ${c.total})  ${city}`)
  }
  const totalNew = sorted.reduce((s, [, c]) => s + c.newCount, 0)
  const totalAll = sorted.reduce((s, [, c]) => s + c.total, 0)
  console.log(`\nTotal: ${totalNew} net new (of ${totalAll} OSM places after chain filter)`)
}
main().catch(e => { console.error(e); process.exit(1) })
