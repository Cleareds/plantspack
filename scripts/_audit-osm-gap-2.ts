// Second pass: candidates I missed in first audit + retry 429s.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const OVERPASS_API = 'https://overpass-api.de/api/interpreter'

const TARGETS: Array<[string, string]> = [
  // Retries
  ['Honduras', 'HN'],
  ['Sri Lanka', 'LK'],
  // Adriatic / Eastern EU candidates I didn't probe
  ['Croatia', 'HR'],
  ['Slovenia', 'SI'],
  ['Serbia', 'RS'],
  ['Bosnia and Herzegovina', 'BA'],
  ['Estonia', 'EE'],
  ['Latvia', 'LV'],
  ['Lithuania', 'LT'],
  ['Ukraine', 'UA'],
  // Smaller western EU candidates
  ['Ireland', 'IE'],
  ['Norway', 'NO'],
  // Bigger countries — sanity check we're not under-served
  ['Czech Republic', 'CZ'],
  ['Mexico', 'MX'],
  ['Chile', 'CL'],
  ['Argentina', 'AR'],
  ['Israel', 'IL'],
  ['South Korea', 'KR'],
  ['China', 'CN'],
  ['Indonesia', 'ID'],
  ['Philippines', 'PH'],
  ['Malaysia', 'MY'],
  ['Singapore', 'SG'],
  ['Thailand', 'TH'],
]

const COUNT_QUERY = (iso: string) => `[out:json][timeout:60];area["ISO3166-1"="${iso}"]->.s;(node["diet:vegan"~"yes|only"](area.s);way["diet:vegan"~"yes|only"](area.s);node["diet:vegetarian"="only"](area.s);way["diet:vegetarian"="only"](area.s);node["cuisine"="vegan"](area.s);way["cuisine"="vegan"](area.s););out count;`

async function overpassCount(iso: string): Promise<number | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 30000))
    try {
      const resp = await fetch(OVERPASS_API, {
        method: 'POST',
        body: `data=${encodeURIComponent(COUNT_QUERY(iso))}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'PlantsPack-Coverage-Audit/1.0',
          'Accept': 'application/json',
        },
      })
      if (!resp.ok) {
        if (resp.status === 429 || resp.status === 504) continue
        return null
      }
      const data = await resp.json()
      const c = data.elements?.[0]?.tags || {}
      return (parseInt(c.nodes || '0') + parseInt(c.ways || '0')) || 0
    } catch {}
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

  for (const [country, iso] of TARGETS) {
    const { data: row } = await sb.from('directory_countries').select('place_count').eq('country', country).maybeSingle()
    const ours = row?.place_count ?? 0
    const osm = await overpassCount(iso)
    const gap = osm == null ? '?' : (osm - ours)
    const ratio = osm == null || ours === 0 ? '' : ` ${(osm / ours).toFixed(1)}x`
    console.log(country.padEnd(28) + String(ours).padStart(8) + String(osm ?? '?').padStart(8) + String(gap).padStart(8) + ratio)
    await new Promise(r => setTimeout(r, 3000))
  }
}
main().catch(e => { console.error(e); process.exit(1) })
