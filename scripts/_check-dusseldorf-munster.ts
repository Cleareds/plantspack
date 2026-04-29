import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
async function main() {
  const env = readFileSync('.env.local','utf8').split('\n').reduce((a:any,l)=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)a[m[1]]=m[2].replace(/^["']|["']$/g,'');return a},{})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  for (const name of ['Düsseldorf','Dusseldorf','Duesseldorf','Wurzburg','Würzburg','Tubingen','Tübingen','Saarbrucken','Saarbrücken']) {
    const { count } = await sb.from('places').select('id',{count:'exact',head:true}).eq('country','Germany').eq('city',name).is('archived_at',null)
    if (count) console.log(`  ${name}: ${count}`)
  }
  // Munster outliers
  const { data } = await sb.from('places').select('id, name, latitude, longitude, address').eq('country','Germany').eq('city','Munster').is('archived_at',null).order('latitude').limit(3)
  console.log('Munster bottom-3 by lat:', data)
  const { data: top } = await sb.from('places').select('id, name, latitude, longitude, address').eq('country','Germany').eq('city','Munster').is('archived_at',null).order('latitude',{ascending:false}).limit(3)
  console.log('Munster top-3 by lat:', top)
}
main()
