import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
// Wild Food BCN: "QQSLOT" filename suggests the domain may be hijacked / SEO-spam injected
// Heura: generic logo, not a place photo
const ids = [
  '06031c1f-53c3-448b-904e-9d9e813ba9b1', // Wild Food BCN
]
// Find Heura
const { data: heura } = await sb.from('places').select('id,name').ilike('name','Heura').eq('city','Barcelona').limit(1)
if (heura?.length) ids.push(heura[0].id)
const r = await sb.from('places').update({ main_image_url: null }).in('id', ids)
console.log('reverted:', r.error?.message || 'ok')
