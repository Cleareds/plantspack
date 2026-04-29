import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
async function main() {
  const env = readFileSync('.env.local','utf8').split('\n').reduce((a:any,l)=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)a[m[1]]=m[2].replace(/^["']|["']$/g,'');return a},{})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const t0 = Date.now()
  const { data } = await sb.from('platform_stats').select('*').single()
  console.log(`${Date.now()-t0}ms`, data)
}
main()
