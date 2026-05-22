import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const checks = [['Malaguetta','Fortaleza'],['TerrAna','Fortaleza'],['Terrana','Fortaleza'],['Pacha','Fortaleza'],['Pachamama','Fortaleza'],['Veganices','Fortaleza'],['GOVEGAN','Fortaleza'],['Veggies On The Table','Fortaleza'],['Sabor Alternativo','Fortaleza'],['Culinária da Lu','Fortaleza']]
for (const [q,c] of checks) {
  const { data } = await sb.from('places').select('slug,name,vegan_level,archived_at').eq('country','Brazil').eq('city',c).ilike('name',`%${q}%`)
  const active = data?.filter(r=>!r.archived_at) || []
  const arch = data?.filter(r=>r.archived_at) || []
  console.log(`${active.length?'HAVE':'NEW '} ${q.padEnd(22)} | active=${active.length} arch=${arch.length} | ${[...active,...arch].map(r=>`${r.slug}(${r.vegan_level})`).join(', ')}`)
}
