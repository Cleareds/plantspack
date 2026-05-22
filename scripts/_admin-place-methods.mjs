import { createClient } from '@supabase/supabase-js'; import * as d from 'dotenv'
d.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
// just paginate and tally
const tally = {}
let from = 0
while (true) {
  const { data: rows } = await sb.from('places').select('verification_method').eq('created_by', ADMIN).is('archived_at',null).range(from, from+999)
  if (!rows?.length) break
  for (const r of rows) {
    const k = r.verification_method || '(null)'
    tally[k] = (tally[k]||0)+1
  }
  if (rows.length<1000) break
  from+=1000
}
const sorted = Object.entries(tally).sort((a,b)=>b[1]-a[1])
console.log('Total admin places by verification_method:')
for (const [k,v] of sorted.slice(0,40)) console.log(`  ${v.toString().padStart(6)}  ${k}`)
console.log(`Total methods: ${sorted.length}, places: ${Object.values(tally).reduce((a,b)=>a+b,0)}`)
