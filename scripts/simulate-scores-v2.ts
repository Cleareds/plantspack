import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Place = { city: string; country: string; category: string; vegan_level: string; average_rating: number | null; review_count: number | null }

async function fetchAll(): Promise<Place[]> {
  const all: Place[] = []
  let off = 0
  while (true) {
    const { data } = await supabase.from('places')
      .select('city, country, category, vegan_level, average_rating, review_count')
      .not('city', 'is', null)
      .range(off, off + 999)
    if (!data || data.length === 0) break
    all.push(...(data as any))
    off += 1000
    if (data.length < 1000) break
  }
  return all
}

function score(c: { fv: number; vf: number; ve: number; placeCount: number; ve_eat: number; ve_store: number; ve_hotel: number; ve_event: number; ve_org: number; sum_w_smoothed: number; sum_w: number; total_rc: number; pop?: number }) {
  const ve = c.ve
  const count_component = 24 * Math.log(1 + ve) / Math.log(51)
  let accessibility: number
  if (c.pop && c.pop > 0) {
    const density = ve / (c.pop / 100000)
    const density_component = 25 * (1 - Math.exp(-density / 6))
    accessibility = Math.min(25, 0.35 * count_component + 0.65 * density_component)
  } else {
    accessibility = Math.min(25, count_component)
  }
  const choice_base = 20 * Math.log(1 + ve) / Math.log(81)
  const purity = c.fv / Math.max(1, c.placeCount)
  const purity_bonus = 5 * Math.sqrt(Math.min(1, purity * 2))
  const choice = Math.min(25, choice_base + purity_bonus)
  const tier = (v: number) => v >= 8 ? 1 : v >= 3 ? 0.7 : v >= 1 ? 0.4 : v > 0 ? 0.15 : 0
  const variety = Math.min(25,
    10 * tier(c.ve_eat) + 6 * tier(c.ve_store) + 5 * tier(c.ve_hotel) +
    2 * tier(c.ve_event) + 2 * tier(c.ve_org))
  const weighted_rating = c.sum_w > 0 ? c.sum_w_smoothed / c.sum_w : 3.8
  const quality_rating = Math.max(0, 18 * (weighted_rating - 3.0) / 2.0)
  const coverage = c.fv > 0 ? c.total_rc / (3 * c.fv) : 0
  const quality_cov = 7 * Math.min(1, coverage)
  const quality = Math.min(25, quality_rating + quality_cov)
  const total = accessibility + choice + variety + quality
  const grade = total >= 88 ? 'A+' : total >= 78 ? 'A' : total >= 62 ? 'B' : total >= 45 ? 'C' : total >= 30 ? 'D' : 'F'
  return { accessibility, choice, variety, quality, total: Math.round(total), grade }
}

async function main() {
  const places = await fetchAll()
  console.log(`Loaded ${places.length} places`)

  const pops: Record<string, number> = JSON.parse(readFileSync(join(process.cwd(), 'public/data/city-populations.json'), 'utf-8'))

  const byCity: Record<string, any> = {}
  for (const p of places) {
    const k = `${p.city}|||${p.country}`
    if (!byCity[k]) byCity[k] = {
      city: p.city, country: p.country, placeCount: 0, fv: 0, vf: 0, ve: 0,
      ve_eat: 0, ve_store: 0, ve_hotel: 0, ve_event: 0, ve_org: 0,
      sum_w_smoothed: 0, sum_w: 0, total_rc: 0,
    }
    const c = byCity[k]
    const ve = p.vegan_level === 'fully_vegan' ? 1 : p.vegan_level === 'vegan_friendly' ? 0.35 : 0
    c.placeCount++
    if (p.vegan_level === 'fully_vegan') c.fv++
    if (p.vegan_level === 'vegan_friendly') c.vf++
    c.ve += ve
    if (p.category === 'eat') c.ve_eat += ve
    else if (p.category === 'store') c.ve_store += ve
    else if (p.category === 'hotel') c.ve_hotel += ve
    else if (p.category === 'event') c.ve_event += ve
    else if (p.category === 'organisation') c.ve_org += ve
    const rc = p.review_count || 0
    const rating = p.average_rating || 0
    const smoothed = (5 * 3.8 + rc * rating) / (5 + rc)
    c.sum_w_smoothed += (0.5 + rc) * smoothed
    c.sum_w += (0.5 + rc)
    c.total_rc += rc
  }

  const cities = Object.entries(byCity)
    .filter(([, c]: any) => c.placeCount >= 5)
    .map(([k, c]: any) => {
      const pop = pops[k]
      return { ...c, pop, ...score({ ...c, pop }) }
    })
    .sort((a, b) => b.total - a.total)

  console.log(`Total cities with >=5 places: ${cities.length}`)
  const dist: Record<string, number> = {}
  cities.forEach(c => { dist[c.grade] = (dist[c.grade] || 0) + 1 })
  console.log('Grade distribution:', dist)

  console.log('\nTop 30 cities under v2 formula:')
  console.log('rank | city, country | total | grade | fv/vf/VE | pop | acc/choice/var/qual')
  cities.slice(0, 30).forEach((c, i) => {
    const popStr = c.pop ? `${(c.pop/1000).toFixed(0)}k` : '—'
    console.log(`${(i+1).toString().padStart(3)} | ${c.city}, ${c.country} | ${c.total} | ${c.grade} | ${c.fv}/${c.vf}/${c.ve.toFixed(1)} | ${popStr} | ${c.accessibility.toFixed(1)}/${c.choice.toFixed(1)}/${c.variety.toFixed(1)}/${c.quality.toFixed(1)}`)
  })

  // Threshold analysis
  console.log('\nCities within 5 pts of B (62):', cities.filter(c => c.total >= 57 && c.total < 62).length)
  console.log('Cities within 5 pts of A (78):', cities.filter(c => c.total >= 73 && c.total < 78).length)
  console.log('Review coverage (places w/ any reviews):', places.filter(p => (p.review_count || 0) > 0).length)
  console.log('Total reviews (sum of review_count):', places.reduce((s, p) => s + (p.review_count || 0), 0))
}

main().catch(e => { console.error(e); process.exit(1) })
