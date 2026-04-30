import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
async function main() {
  const env = readFileSync('.env.local','utf8').split('\n').reduce((a:any,l)=>{const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)a[m[1]]=m[2].replace(/^["']|["']$/g,'');return a},{})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const { data } = await sb.from('places')
    .select('id, name, city, website, description, tags, verification_status')
    .eq('source','osm-import-2026-04').eq('country','Denmark').eq('vegan_level','fully_vegan').is('archived_at',null)
  console.log(`fully_vegan in DK batch: ${data?.length}`)
  for (const p of data || []) {
    console.log(`\n- ${p.name} (${p.city})`)
    console.log(`  website: ${p.website || '(none)'}`)
    console.log(`  desc:    ${p.description?.slice(0,140) || '(none)'}`)
    console.log(`  tags:    ${(p.tags || []).join(', ') || '(none)'}`)
    console.log(`  status:  ${p.verification_status || '(none)'}`)
  }
}
main()
