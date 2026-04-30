// Find the next 50-100 cities to write CITY_CONTEXT for, after the top 47.
// Ordered by a search-traffic proxy: place_count + capital/tourist boost.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Cities already covered in CITY_CONTEXT (manually mirrored - keep in sync).
const COVERED = new Set([
  'Berlin, Germany','Paris, France','Wien, Austria','Hamburg, Germany',
  'Frankfurt am Main, Germany','Praha, Czech Republic','Helsinki, Finland',
  'Gent, Belgium','Lyon, France','København, Denmark','Bruxelles - Brussel, Belgium',
  'Graz, Austria','Brno, Czech Republic','Dresden, Germany','Bremen, Germany',
  'London, United Kingdom','Amsterdam, Netherlands','New York, United States',
  'Brooklyn, United States','Los Angeles, United States','Barcelona, Spain',
  'Madrid, Spain','Lisbon, Portugal','Rome, Italy','Milan, Italy','Florence, Italy',
  'Athens, Greece','Istanbul, Turkey','Stockholm, Sweden','Oslo, Norway',
  'Reykjavik, Iceland','Edinburgh, United Kingdom','Manchester, United Kingdom',
  'Brighton, United Kingdom','Toronto, Canada','Montreal, Canada','Vancouver, Canada',
  'San Francisco, United States','Portland, United States','Seattle, United States',
  'Tel Aviv, Israel','Tokyo, Japan','Kyoto, Japan','Bangkok, Thailand',
  'Chiang Mai, Thailand','Bali, Indonesia','Ubud, Indonesia','Mexico City, Mexico',
])

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data } = await sb.from('directory_cities')
    .select('city, country, place_count')
    .gte('place_count', 30)
    .order('place_count', { ascending: false })
    .limit(300)

  const remaining = (data || []).filter((r: any) => !COVERED.has(`${r.city}, ${r.country}`))
  console.log(`After excluding 47 covered, next ${remaining.length} candidates by place_count:\n`)
  console.log('  rank  city                          country               places')
  console.log('  ' + '-'.repeat(70))
  remaining.slice(0, 100).forEach((r: any, i: number) => {
    console.log(`  ${(i + 1).toString().padStart(4)}  ${r.city.padEnd(28)} ${r.country.padEnd(20)}  ${r.place_count.toString().padStart(5)}`)
  })
}
main().catch(e => { console.error(e); process.exit(1) })
