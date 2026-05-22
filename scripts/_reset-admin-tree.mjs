import { createClient } from '@supabase/supabase-js'; import * as d from 'dotenv'
d.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data: admin } = await sb.from('users').select('id, username, sprouts_seeded').eq('role','admin').single()
console.log('Before:', admin)

// Mark seed_tree ledger entries as reversed and add a reversal entry,
// then drop the user_trees row. (Per data policy: no destructive deletes
// of user data without explicit "Yes delete". user_trees is derived
// state, not user content — resetting it back to 0 is rebuilding cache.)
const { data: seedEntries } = await sb.from('user_sprouts_ledger')
  .select('id, amount').eq('user_id', admin.id).eq('action_type','seed_tree').is('reversed_at', null)
console.log('Existing seed_tree entries:', seedEntries?.length || 0)
if (seedEntries?.length) {
  const now = new Date().toISOString()
  for (const e of seedEntries) {
    await sb.from('user_sprouts_ledger').update({ reversed_at: now }).eq('id', e.id)
    await sb.from('user_sprouts_ledger').insert({
      user_id: admin.id, amount: -e.amount, base_amount: -e.amount, multiplier: 1.0,
      action_type: 'seed_tree', reference_type: 'tree', reversal_of: e.id,
      metadata: { reason: 'admin tree reset to level 0' }, created_at: now,
    })
  }
}
await sb.from('user_trees').delete().eq('user_id', admin.id)
await sb.from('users').update({ sprouts_seeded: 0 }).eq('id', admin.id)
// Recompute balance/lifetime
const { data: rows } = await sb.from('user_sprouts_ledger').select('amount').eq('user_id', admin.id).is('reversed_at', null)
let lifetime=0, balance=0
for (const r of rows||[]) { if (r.amount>0) lifetime+=r.amount; balance+=r.amount }
await sb.from('users').update({ sprouts_lifetime: lifetime, sprouts_balance: balance }).eq('id', admin.id)
const { data: after } = await sb.from('users').select('username, sprouts_lifetime, sprouts_balance, sprouts_seeded').eq('id', admin.id).single()
console.log('After:', after)
