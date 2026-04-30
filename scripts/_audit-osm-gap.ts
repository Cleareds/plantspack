// Estimate the OSM gap for under-covered countries:
//   our_count vs Overpass count of (diet:vegan OR diet:vegetarian=only OR cuisine=vegan)
// Overpass `out count` returns just counts per element type — fast and small.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const OVERPASS_API = 'https://overpass-api.de/api/interpreter'

// Country -> ISO 3166-1 alpha-2. Names match what's in directory_countries.
const TARGETS: Array<[string, string]> = [
  // Western/Northern Europe — thin in our DB despite being vegan hubs
  ['Denmark', 'DK'],
  ['Iceland', 'IS'],
  // Asia — major gaps
  ['Hong Kong', 'HK'],
  ['Pakistan', 'PK'],
  ['Mongolia', 'MN'],
  ['Kyrgyzstan', 'KG'],
  ['Tajikistan', 'TJ'],
  ['Turkmenistan', 'TM'],
  ['Uzbekistan', 'UZ'],
  ['Kazakhstan', 'KZ'],
  // Middle East
  ['Saudi Arabia', 'SA'],
  ['Kuwait', 'KW'],
  ['Qatar', 'QA'],
  ['Lebanon', 'LB'],
  ['Jordan', 'JO'],
  ['Oman', 'OM'],
  // Africa
  ['Kenya', 'KE'],
  ['Egypt', 'EG'],
  ['Morocco', 'MA'],
  ['Nigeria', 'NG'],
  ['Ghana', 'GH'],
  ['Tanzania', 'TZ'],
  ['Uganda', 'UG'],
  // Latin America thinner spots
  ['Honduras', 'HN'],
  ['Nicaragua', 'NI'],
  ['El Salvador', 'SV'],
  ['Paraguay', 'PY'],
  ['Bolivia', 'BO'],
  ['Ecuador', 'EC'],
  ['Cuba', 'CU'],
  // Caribbean — many <5
  ['Dominican Republic', 'DO'],
  ['Trinidad and Tobago', 'TT'],
  ['Jamaica', 'JM'],
  // Notable other thin
  ['Nepal', 'NP'],
  ['Bangladesh', 'BD'],
  ['Sri Lanka', 'LK'],
  ['Myanmar', 'MM'],
  ['Iran', 'IR'],
  ['Albania', 'AL'],
  ['Belarus', 'BY'],
  ['Cyprus', 'CY'],
  ['Malta', 'MT'],
  ['Luxembourg', 'LU'],
]

const COUNT_QUERY = (iso: string) => `[out:json][timeout:60];area["ISO3166-1"="${iso}"]->.s;(node["diet:vegan"~"yes|only"](area.s);way["diet:vegan"~"yes|only"](area.s);node["diet:vegetarian"="only"](area.s);way["diet:vegetarian"="only"](area.s);node["cuisine"="vegan"](area.s);way["cuisine"="vegan"](area.s););out count;`

async function overpassCount(iso: string): Promise<number | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(OVERPASS_API, {
        method: 'POST',
        body: `data=${encodeURIComponent(COUNT_QUERY(iso))}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'PlantsPack-Coverage-Audit/1.0 (https://plantspack.com)',
          'Accept': 'application/json',
        },
      })
      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        console.error(`  [${iso}] ${resp.status} ${resp.statusText}: ${text.slice(0, 200)}`)
        if (resp.status === 429 || resp.status === 504) {
          await new Promise(r => setTimeout(r, 30000))
          continue
        }
        return null
      }
      const data = await resp.json()
      const counts = data.elements?.[0]?.tags || {}
      return (parseInt(counts.nodes || '0') + parseInt(counts.ways || '0')) || 0
    } catch (e: any) {
      console.error(`  [${iso}] fetch error: ${e?.message}`)
      if (attempt < 2) await new Promise(r => setTimeout(r, 15000))
    }
  }
  return null
}

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  console.log('Country'.padEnd(28) + 'Ours'.padStart(8) + 'OSM'.padStart(8) + 'Gap'.padStart(8) + '  ratio')
  console.log('-'.repeat(60))

  const rows: Array<{ country: string; iso: string; ours: number; osm: number | null }> = []

  for (const [country, iso] of TARGETS) {
    const { data: row } = await sb.from('directory_countries').select('place_count').eq('country', country).maybeSingle()
    const ours = row?.place_count ?? 0
    const osm = await overpassCount(iso)
    rows.push({ country, iso, ours, osm })
    const gap = osm == null ? '?' : (osm - ours)
    const ratio = osm == null || ours === 0 ? '' : ` ${(osm / ours).toFixed(1)}x`
    console.log(country.padEnd(28) + String(ours).padStart(8) + String(osm ?? '?').padStart(8) + String(gap).padStart(8) + ratio)
    await new Promise(r => setTimeout(r, 1500)) // be polite
  }

  // Print sorted by absolute gap
  console.log('\n=== Sorted by absolute gap (OSM - Ours) ===')
  rows.filter(r => r.osm != null).sort((a, b) => ((b.osm ?? 0) - b.ours) - ((a.osm ?? 0) - a.ours)).forEach(r => {
    const gap = (r.osm as number) - r.ours
    if (gap > 0) console.log(`  +${gap.toString().padStart(4)}  ${r.country.padEnd(28)} (have ${r.ours}, OSM ${r.osm})`)
  })

  console.log('\n=== Sorted by ratio (likely high overlap risk if low) ===')
  rows.filter(r => r.osm != null && r.ours > 0).sort((a, b) => ((b.osm ?? 0) / b.ours) - ((a.osm ?? 0) / a.ours)).forEach(r => {
    const ratio = (r.osm as number) / r.ours
    if (ratio > 1.5) console.log(`  ${ratio.toFixed(1)}x  ${r.country.padEnd(28)} (have ${r.ours}, OSM ${r.osm})`)
  })
}
main().catch(e => { console.error(e); process.exit(1) })
