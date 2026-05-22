import { createClient } from '@supabase/supabase-js'; import * as d from 'dotenv'
d.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data: u } = await sb.from('users').select('id, username, sprouts_lifetime, sprouts_balance, sprouts_seeded').eq('role','admin')
console.log('Admin Sprouts state:'); console.table(u)
const { count } = await sb.from('user_sprouts_ledger').select('id',{count:'exact',head:true})
console.log(`Ledger rows: ${count}`)
