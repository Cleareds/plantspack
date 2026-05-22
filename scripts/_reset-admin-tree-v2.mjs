import { createClient } from '@supabase/supabase-js'; import * as d from 'dotenv'
d.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data: admin } = await sb.from('users').select('id, username, sprouts_lifetime, sprouts_balance, sprouts_seeded, forest_size').eq('role','admin').single()
console.log('Before:', admin)

// Reverse all seed_tree ledger entries
const { data: seedEntries } = await sb.from('user_sprouts_ledger')
  .select('id, amount').eq('user_id', admin.id).eq('action_type','seed_tree').is('reversed_at', null)
console.log('Active seed_tree entries:', seedEntries?.length || 0)
const now = new Date().toISOString()
for (const e of seedEntries || []) {
  await sb.from('user_sprouts_ledger').update({ reversed_at: now }).eq('id', e.id)
  await sb.from('user_sprouts_ledger').insert({
    user_id: admin.id, amount: -e.amount, base_amount: -e.amount, multiplier: 1.0,
    action_type: 'seed_tree', reference_type: 'tree', reversal_of: e.id,
    metadata: { reason: 'admin reset v2' }, created_at: now,
  })
}

// Drop any forest trees + the current tree row
const { count: forestRows } = await sb.from('user_forest_trees').select('id',{count:'exact',head:true}).eq('user_id', admin.id)
if (forestRows && forestRows > 0) {
  await sb.from('user_forest_trees').delete().eq('user_id', admin.id)
  console.log(`Deleted ${forestRows} forest rows`)
}
await sb.from('user_trees').delete().eq('user_id', admin.id)

// Recompute (exclude reversal entries from lifetime)
const { data: rows } = await sb.from('user_sprouts_ledger').select('amount, reversal_of').eq('user_id', admin.id).is('reversed_at', null)
let lifetime=0, balance=0
for (const r of rows||[]) { if (r.amount>0 && !r.reversal_of) lifetime+=r.amount; balance+=r.amount }
await sb.from('users').update({ sprouts_lifetime: lifetime, sprouts_balance: balance, sprouts_seeded: 0, forest_size: 0 }).eq('id', admin.id)
const { data: after } = await sb.from('users').select('username, sprouts_lifetime, sprouts_balance, sprouts_seeded, forest_size').eq('id', admin.id).single()
console.log('After:', after)
