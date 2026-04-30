// Post-import audit for Denmark batch: how many imported, how many got
// descriptions from og:meta enrichment, how many still need one.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const sourceTag = 'osm-import-2026-04'
  const { count: total } = await sb.from('places').select('id', { count: 'exact', head: true })
    .eq('source', sourceTag).eq('country', 'Denmark').is('archived_at', null)
  const { count: withDesc } = await sb.from('places').select('id', { count: 'exact', head: true })
    .eq('source', sourceTag).eq('country', 'Denmark').is('archived_at', null)
    .not('description', 'is', null).neq('description', '')
  const { count: withImage } = await sb.from('places').select('id', { count: 'exact', head: true })
    .eq('source', sourceTag).eq('country', 'Denmark').is('archived_at', null)
    .not('main_image_url', 'is', null)
  const { count: withWebsite } = await sb.from('places').select('id', { count: 'exact', head: true })
    .eq('source', sourceTag).eq('country', 'Denmark').is('archived_at', null)
    .not('website', 'is', null).neq('website', '')

  console.log(`Denmark batch (source=${sourceTag}):`)
  console.log(`  Total imported:    ${total}`)
  console.log(`  With website:      ${withWebsite}`)
  console.log(`  With image:        ${withImage}`)
  console.log(`  With description:  ${withDesc}`)
  console.log(`  Need description:  ${(total ?? 0) - (withDesc ?? 0)}`)

  // Sample 5 places without description
  const { data } = await sb.from('places')
    .select('id, name, city, category, vegan_level, cuisine_types, tags, website')
    .eq('source', sourceTag).eq('country', 'Denmark').is('archived_at', null)
    .or('description.is.null,description.eq.')
    .limit(5)
  console.log('\nSample needing description:')
  for (const p of data || []) console.log(`  - ${p.name} (${p.city}, ${p.category}, ${p.vegan_level})`)
}
main().catch(e => { console.error(e); process.exit(1) })
