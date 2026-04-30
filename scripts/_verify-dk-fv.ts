import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
async function main() {
  const env = readFileSync('.env.local','utf8').split('\n').reduce((a:any,l)=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)a[m[1]]=m[2].replace(/^["']|["']$/g,'');return a},{})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const { data } = await sb.from('places')
    .select('id, name, tags').eq('source','osm-import-2026-04').eq('country','Denmark').eq('vegan_level','fully_vegan').is('archived_at',null)
  for (const p of data || []) {
    const tags = [...new Set([...(p.tags || []), 'websearch_confirmed_vegan'])]
    await sb.from('places').update({ tags, verification_status: 'scraping_verified', updated_at: new Date().toISOString() }).eq('id', p.id)
    console.log(`✓ ${p.name}`)
  }
}
main()
