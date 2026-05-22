import { createClient } from '@supabase/supabase-js'; import * as d from 'dotenv'
d.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const tally = {}
let from = 0
while (true) {
  const { data } = await sb.from('places').select('subcategory').eq('category','hotel').is('archived_at',null).range(from, from+999)
  if (!data?.length) break
  for (const r of data) {
    const k = r.subcategory || '(null)'
    tally[k] = (tally[k]||0)+1
  }
  if (data.length<1000) break
  from+=1000
}
console.log('Hotel subcategories in use:')
for (const [k,v] of Object.entries(tally).sort((a,b)=>b[1]-a[1])) console.log(`  ${v.toString().padStart(5)}  ${k}`)
