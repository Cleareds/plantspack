import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data } = await sb.from('places').select('*').eq('city','Berlin').limit(1)
if (data?.[0]) {
  const sample = data[0]
  console.log('Schema fields:', Object.keys(sample).join(', '))
  console.log('\nSample required-looking fields:')
  for (const k of ['name','address','city','country','latitude','longitude','category','vegan_level','source','user_id','description','slug']) {
    console.log(`  ${k}: ${JSON.stringify(sample[k])?.slice(0,80)}`)
  }
}
