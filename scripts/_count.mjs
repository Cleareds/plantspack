import { createClient } from '@supabase/supabase-js'; import * as d from 'dotenv'
d.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data: admins } = await sb.from('users').select('id, username').eq('role','admin')
console.log('admins:', admins)
for (const a of admins) {
  const { count } = await sb.from('places').select('id', { count:'exact', head:true }).eq('created_by', a.id).is('archived_at',null)
  const { count: rc } = await sb.from('place_reviews').select('id', { count:'exact', head:true }).eq('user_id', a.id)
  const { count: cc } = await sb.from('place_corrections').select('id', { count:'exact', head:true }).eq('user_id', a.id).eq('status','approved')
  console.log(`  ${a.username}: places=${count} reviews=${rc} corrections=${cc}`)
}
