import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Pull our 16 Bundesländer + their city_names lists
const { data: regions } = await sb.from('country_regions').select('region_slug,region_name,city_names').eq('country_slug','germany').order('sort_order')

// Get place counts per region
const all = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('city,vegan_level').eq('country','Germany').is('archived_at',null).range(from,from+999)
  if (!data?.length) break
  all.push(...data); if (data.length<1000) break; from+=1000
}
const cityCounts = {}
const cityFVCounts = {}
for (const r of all) {
  cityCounts[r.city] = (cityCounts[r.city]||0)+1
  if (r.vegan_level === 'fully_vegan') cityFVCounts[r.city] = (cityFVCounts[r.city]||0)+1
}

console.log('REGION COVERAGE:')
console.log('Region'.padEnd(28), 'Cities', '  Places', '  FV', '  Top cities')
for (const r of regions) {
  let regionPlaces = 0, regionFV = 0
  const cityHits = []
  for (const c of r.city_names) {
    if (cityCounts[c]) {
      regionPlaces += cityCounts[c]
      regionFV += cityFVCounts[c] || 0
      cityHits.push([c, cityCounts[c], cityFVCounts[c]||0])
    }
  }
  cityHits.sort((a,b)=>b[1]-a[1])
  const top = cityHits.slice(0,3).map(([c,n,fv])=>`${c}(${n}/${fv}FV)`).join(', ')
  console.log(r.region_name.padEnd(28), String(cityHits.length).padStart(6), String(regionPlaces).padStart(7), String(regionFV).padStart(5), '  ' + top)
}

// Cities in DB that aren't in any region (orphans)
const known = new Set(regions.flatMap(r=>r.city_names))
const orphans = Object.entries(cityCounts).filter(([c]) => !known.has(c)).sort((a,b)=>b[1]-a[1])
console.log(`\nORPHAN CITIES (in DB but not assigned to a Bundesland): ${orphans.length}`)
console.log('Top 25 orphans by place count:')
for (const [c,n] of orphans.slice(0,25)) console.log(`  ${c.padEnd(35)} ${n} places (${cityFVCounts[c]||0} FV)`)
