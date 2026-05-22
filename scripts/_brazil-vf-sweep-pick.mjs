import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Pick 10 random-ish vegan_friendly per top-5 city to verify
const cities = ['São Paulo','Porto Alegre','Rio de Janeiro','Belo Horizonte','Brasilia']
const picks = []
for (const c of cities) {
  const { data } = await sb.from('places').select('slug,name,city,description,website').eq('country','Brazil').eq('city',c).eq('vegan_level','vegan_friendly').is('archived_at',null).limit(10)
  console.log(`\n=== ${c} (${data?.length||0} sample) ===`)
  for (const r of (data||[])) {
    console.log(`  ${r.slug.padEnd(40)} | ${r.name.padEnd(30)} | ${(r.description||'').slice(0,55)}`)
    picks.push({ city: c, slug: r.slug, name: r.name, website: r.website })
  }
}
console.log(`\nTotal sample: ${picks.length}`)
import fs from 'node:fs'
fs.writeFileSync('/tmp/brazil-vf-sample.json', JSON.stringify(picks,null,2))
