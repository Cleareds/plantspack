// Dump places from a source tag that lack a description, in a compact JSON
// shape ready to feed into Claude for batch description generation.
//
// Usage:
//   npx tsx scripts/_fetch-places-needing-desc.ts --source osm-import-2026-04 --country Denmark > /tmp/needs-desc.json
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const args = process.argv.slice(2)
  const source = args[args.indexOf('--source') + 1] || 'osm-import-2026-04'
  const country = args[args.indexOf('--country') + 1] || 'Denmark'

  const { data } = await sb.from('places')
    .select('id, name, city, country, category, vegan_level, cuisine_types, tags, address, website')
    .eq('source', source)
    .eq('country', country)
    .is('archived_at', null)
    .or('description.is.null,description.eq.')
    .order('city')
  console.log(JSON.stringify(data || [], null, 2))
}
main().catch(e => { console.error(e); process.exit(1) })
