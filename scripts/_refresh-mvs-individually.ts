import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
async function main() {
  const env = readFileSync('.env.local','utf8').split('\n').reduce((a:any,l)=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)a[m[1]]=m[2].replace(/^["']|["']$/g,'');return a},{})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: 'public' as any }, global: { headers: { 'X-Statement-Timeout': '120000' } } as any,
  })
  // Use raw RPC for each MV via dedicated functions if available; otherwise just log status.
  for (const fn of ['refresh_directory_views']) {
    const t0 = Date.now()
    const { error } = await sb.rpc(fn as any)
    console.log(`${fn}: ${error ? 'ERR ' + error.message : 'OK'} ${Date.now()-t0}ms`)
  }
  // Check counts post-refresh
  const { data } = await sb.from('directory_countries').select('country, place_count').in('country', ['Czech Republic','Czechia'])
  console.log('post-refresh:', data)
}
main()
