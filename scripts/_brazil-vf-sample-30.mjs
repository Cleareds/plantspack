import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
// After bulk reclass + cross-border fix, sample 30 vegan_friendly from top cities
const cities = ['São Paulo','Porto Alegre','Rio de Janeiro','Belo Horizonte','Brasilia','Curitiba']
const picks = []
for (const c of cities) {
  const { data } = await sb.from('places').select('slug,name,city,description,website,address').eq('country','Brazil').eq('city',c).eq('vegan_level','vegan_friendly').is('archived_at',null).order('id').limit(5)
  for (const r of data||[]) picks.push(r)
}
console.log(`Sample size: ${picks.length}`)
for (const r of picks) console.log(`  ${r.slug.padEnd(40)} | ${r.name.padEnd(28)} | ${r.city.padEnd(16)} | ${(r.description||'').slice(0,50)}`)
