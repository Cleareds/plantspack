import { createClient } from '@supabase/supabase-js'; import * as d from 'dotenv'
d.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data: admin } = await sb.from('users').select('id').eq('role','admin').single()
const { data: rows } = await sb.from('user_sprouts_ledger')
  .select('amount, reversal_of').eq('user_id', admin.id).is('reversed_at', null)
let lifetime=0, balance=0
for (const r of rows||[]) {
  if (r.amount>0 && !r.reversal_of) lifetime+=r.amount
  balance+=r.amount
}
await sb.from('users').update({ sprouts_lifetime: lifetime, sprouts_balance: balance, sprouts_seeded: 0 }).eq('id', admin.id)
const { data: after } = await sb.from('users').select('username, sprouts_lifetime, sprouts_balance, sprouts_seeded').eq('id', admin.id).single()
console.log('Fixed:', after)
