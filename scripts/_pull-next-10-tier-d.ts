import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync } from 'fs'
config({ path: '.env.local' })

const TARGETS: Array<[string, string]> = [
  ['Hamburg', 'Germany'],
  ['Leipzig', 'Germany'],
  ['Munich', 'Germany'],
  ['Thu Duc', 'Vietnam'],
  ['Bengaluru', 'India'],
  ['Cologne', 'Germany'],
  ['Frankfurt am Main', 'Germany'],
  ['Taipei', 'Taiwan'],
  ['Taichung', 'Taiwan'],
  ['Beijing', 'China'],
]

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const all: any[] = []
  for (const [city, country] of TARGETS) {
    const { data } = await sb.from('places')
      .select('id, name, city, country, source, address, latitude, longitude')
      .eq('vegan_level', 'fully_vegan').is('archived_at', null)
      .ilike('city', city).ilike('country', country)
      .or('website.is.null,website.eq.')
    if (data) all.push(...data.map(r => ({ ...r, target_city: city })))
  }
  console.log(`Total: ${all.length}`)
  const out = ['target_city,id,name,city,country,source,address']
  for (const r of all) {
    out.push([r.target_city, r.id, r.name, r.city, r.country, r.source, r.address].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
  }
  writeFileSync('reports/tier-d-batch2.csv', out.join('\n'))
  console.log(`Written: reports/tier-d-batch2.csv`)
}
main()
