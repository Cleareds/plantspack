// Pick top SEO-candidate cities for curated packs:
// - have many places (signal of demand and credibility)
// - have a high score (justifies a "best vegan in X" pack)
// - are tourist destinations (search volume from travel intent)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const TRAVEL_HUBS = new Set([
  'Berlin','London','New York','Los Angeles','Paris','Barcelona','Madrid','Lisbon',
  'Amsterdam','Vienna','Munich','Hamburg','Cologne','Frankfurt','Prague','Budapest',
  'Rome','Milan','Florence','Venice','Naples','Athens','Istanbul','Copenhagen',
  'Stockholm','Oslo','Helsinki','Reykjavik','Dublin','Edinburgh','Glasgow',
  'Tel Aviv','Bangkok','Tokyo','Kyoto','Osaka','Seoul','Taipei','Singapore',
  'Hong Kong','Mumbai','Delhi','Bangalore','Chennai','Bali','Ubud','Chiang Mai',
  'Mexico City','Buenos Aires','Sao Paulo','Rio de Janeiro','Lima','Bogota',
  'Cape Town','Marrakech','Cairo','Sydney','Melbourne','Auckland',
  'Toronto','Vancouver','Montreal','Chicago','Seattle','San Francisco','Austin',
  'Portland','Boston','Miami','Brooklyn','Brighton','Manchester','Bristol',
])

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // Pull top cities by score, full data
  const { data: scores } = await sb.from('city_scores')
    .select('city, country, score, grade, place_count, fv_count')
    .gte('place_count', 30)
    .order('score', { ascending: false })
    .limit(80)

  console.log('Top SEO-candidate cities (place_count>=30, ranked by score + travel-hub bonus):\n')
  console.log('rank  city                       country               score grade pl  fv  hub')
  console.log('-'.repeat(85))
  const ranked = (scores || []).map((c: any) => ({
    ...c,
    isHub: TRAVEL_HUBS.has(c.city),
    // Compound: (score / 10) + (place_count / 50) + hub bonus
    rank: (c.score / 10) + Math.min(c.place_count / 50, 5) + (TRAVEL_HUBS.has(c.city) ? 4 : 0)
  })).sort((a: any, b: any) => b.rank - a.rank)

  for (let i = 0; i < Math.min(ranked.length, 30); i++) {
    const r = ranked[i]
    const tag = r.isHub ? '✓' : ' '
    console.log(`  ${(i + 1).toString().padStart(3)}  ${r.city.padEnd(26)} ${r.country.padEnd(20)}  ${r.score.toString().padStart(3)}  ${r.grade.padEnd(3)} ${r.place_count.toString().padStart(4)} ${r.fv_count.toString().padStart(3)}  ${tag}`)
  }

  console.log('\nMy top 5 picks (highest score × tourist intent × pack-able variety):')
  const top5 = ranked.filter((r: any) => r.isHub).slice(0, 5)
  for (const r of top5) {
    console.log(`  ${r.city}, ${r.country} - ${r.place_count} places (${r.fv_count} fully vegan), grade ${r.grade}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
