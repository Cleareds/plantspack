// Step #1 of the audit plan: cheap signal-based screen.
// No web/API calls. Pure DB scan + heuristics.
//
// Goal: rank fully_vegan places by "likely mislabelled" risk so manual review
// can target the worst offenders first. Outputs a CSV ranked desc by score.
//
// Risk signals (each adds points):
//   +3  source = 'openstreetmap' or 'osm-import-*'   (volunteer tag, often wrong)
//   +2  source includes 'vegguide' AND >5y old by created_at (unmaintained 2018+)
//   +2  no website AND no description
//   +2  name has zero vegan keywords (vegan, vegana, plant, raw, herb*, krishna, govinda, vegetal)
//   +2  name suggests animal-centric category (sushi, ramen, burger, pizza, steak, BBQ, brasserie, churrasc*, parrilla, asado)
//   +1  no opening_hours
//   +1  no phone
//   +1  no images / no main_image_url
//   +1  city has >50 fully_vegan rows (high volume = more chance of OSM noise)
//
// Score >=6 -> high suspicion
// Score 4-5 -> medium
// Score <4  -> probably fine

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync } from 'fs'
config({ path: '.env.local' })

const VEGAN_KEYWORDS = ['vegan', 'vegana', 'vegano', 'plant', 'raw', 'herbi', 'krishna', 'govinda', 'vegetal', 'verde', 'verd']
const ANIMAL_KEYWORDS = [
  'sushi', 'ramen', 'burger', 'pizza', 'steak', 'bbq', 'barbecue', 'brasserie',
  'churras', 'parrilla', 'asado', 'fish', 'seafood', 'meat', 'chicken', 'pollo',
  'pesce', 'kebab', 'doner', 'fried chicken', 'hot dog', 'sausage', 'butcher',
]

function lc(s: string | null | undefined) { return (s ?? '').toLowerCase() }
function hasAny(haystack: string, needles: string[]) {
  return needles.some(n => haystack.includes(n))
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // First pass: city counts so we can flag high-volume cities.
  const cityCount = new Map<string, number>()
  let cursor: string | null = null
  for (;;) {
    let q = sb.from('places').select('id, city, country').eq('vegan_level', 'fully_vegan').is('archived_at', null).order('id').limit(1000)
    if (cursor) q = q.gt('id', cursor)
    const { data, error } = await q
    if (error) { console.error(error); process.exit(1) }
    if (!data || data.length === 0) break
    for (const r of data) {
      const k = `${r.city}|${r.country}`
      cityCount.set(k, (cityCount.get(k) ?? 0) + 1)
    }
    cursor = data[data.length - 1].id
    if (data.length < 1000) break
  }

  // Second pass: score every fully_vegan row.
  const rows: Array<any> = []
  cursor = null
  for (;;) {
    let q = sb.from('places')
      .select('id, slug, name, address, city, country, vegan_level, source, website, phone, description, main_image_url, images, opening_hours, created_at')
      .eq('vegan_level', 'fully_vegan').is('archived_at', null)
      .order('id').limit(1000)
    if (cursor) q = q.gt('id', cursor)
    const { data, error } = await q
    if (error) { console.error(error); process.exit(1) }
    if (!data || data.length === 0) break
    for (const r of data) {
      let score = 0
      const reasons: string[] = []
      const src = lc(r.source)
      const name = lc(r.name)
      const cityKey = `${r.city}|${r.country}`

      if (src === 'openstreetmap' || src.startsWith('osm-import')) {
        score += 3; reasons.push('osm-source')
      }
      if (src.includes('vegguide')) {
        const createdYear = r.created_at ? new Date(r.created_at).getFullYear() : 9999
        // VegGuide data itself is the issue (last maintained ~2020), so any vegguide-* import scores.
        score += 2; reasons.push('vegguide-source')
      }
      if (!r.website && !r.description) { score += 2; reasons.push('no-website-no-desc') }
      if (!hasAny(name, VEGAN_KEYWORDS)) { score += 2; reasons.push('name-no-vegan-keyword') }
      if (hasAny(name, ANIMAL_KEYWORDS)) { score += 2; reasons.push('name-animal-keyword') }
      if (!r.opening_hours) { score += 1; reasons.push('no-hours') }
      if (!r.phone) { score += 1; reasons.push('no-phone') }
      if (!r.main_image_url && (!r.images || r.images.length === 0)) { score += 1; reasons.push('no-image') }
      if ((cityCount.get(cityKey) ?? 0) > 50) { score += 1; reasons.push('high-volume-city') }

      rows.push({
        score,
        id: r.id,
        slug: r.slug,
        name: r.name,
        city: r.city,
        country: r.country,
        source: r.source,
        website: r.website,
        reasons: reasons.join('|'),
      })
    }
    cursor = data[data.length - 1].id
    if (data.length < 1000) break
  }

  rows.sort((a, b) => b.score - a.score)

  // Bucket summary.
  const buckets = { high: 0, medium: 0, low: 0 }
  for (const r of rows) {
    if (r.score >= 6) buckets.high++
    else if (r.score >= 4) buckets.medium++
    else buckets.low++
  }

  const total = rows.length
  console.log(`Scored ${total} fully_vegan places (active only).`)
  console.log(`  HIGH suspicion (score >=6):   ${buckets.high}  (${(buckets.high/total*100).toFixed(1)}%)`)
  console.log(`  MEDIUM suspicion (score 4-5): ${buckets.medium}  (${(buckets.medium/total*100).toFixed(1)}%)`)
  console.log(`  LOW suspicion (score <4):     ${buckets.low}  (${(buckets.low/total*100).toFixed(1)}%)`)

  // Top 30 highest suspicion to console.
  console.log('\nTop 30 highest-suspicion places:')
  for (const r of rows.slice(0, 30)) {
    console.log(`  [${r.score}]  ${r.name}  |  ${r.city}, ${r.country}  |  src=${r.source ?? '∅'}  |  ${r.reasons}`)
  }

  // Write full CSV.
  const out = ['score,id,slug,name,city,country,source,website,reasons']
  for (const r of rows) {
    const cells = [r.score, r.id, r.slug, r.name, r.city, r.country, r.source, r.website ?? '', r.reasons]
      .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
    out.push(cells.join(','))
  }
  writeFileSync('reports/fully-vegan-suspicion.csv', out.join('\n'))
  console.log(`\nFull ranked list: reports/fully-vegan-suspicion.csv`)
}
main()
