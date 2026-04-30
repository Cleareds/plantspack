// Quality audit for Phase 2 OSM batch (osm-import-2026-04 across NO + NI).
// Sanity-check that the new standardised pipeline produced the expected
// 5-field shape for every imported place.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // Phase 2 places: created in the last 30 minutes under the same source tag.
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: places } = await sb.from('places')
    .select('id, name, slug, city, country, category, vegan_level, address, phone, website, main_image_url, opening_hours, description, latitude, longitude')
    .eq('source', 'osm-import-2026-04')
    .gte('created_at', cutoff)
    .is('archived_at', null)
    .order('country, city, name' as any)
  if (!places || places.length === 0) { console.log('No Phase 2 places found.'); return }

  const byCountry: Record<string, any[]> = {}
  for (const p of places) (byCountry[p.country] ||= []).push(p)

  for (const [country, ps] of Object.entries(byCountry)) {
    const total = ps.length
    const has = (f: (p: any) => boolean) => ps.filter(f).length
    console.log(`\n=== ${country} (${total} new) ===`)
    console.log(`  description    ${has(p => p.description?.length > 20)}/${total}`)
    console.log(`  address        ${has(p => p.address?.length > 5)}/${total}`)
    console.log(`  city           ${has(p => p.city)}/${total}`)
    console.log(`  website        ${has(p => p.website)}/${total}`)
    console.log(`  phone          ${has(p => p.phone)}/${total}`)
    console.log(`  image          ${has(p => p.main_image_url)}/${total}`)
    console.log(`  opening_hours  ${has(p => p.opening_hours && Object.keys(p.opening_hours).length)}/${total}`)
    const lvl: Record<string, number> = {}
    for (const p of ps) lvl[p.vegan_level || 'null'] = (lvl[p.vegan_level || 'null'] || 0) + 1
    console.log(`  vegan_level:   ${Object.entries(lvl).map(([k, v]) => `${k}=${v}`).join(' ')}`)
    console.log(`  Sample:`)
    for (const p of ps.slice(0, 3)) {
      console.log(`    - ${p.name} (${p.city}) | ${p.vegan_level} | addr="${p.address?.slice(0, 60)}"`)
      console.log(`      desc: ${p.description?.slice(0, 100)}`)
    }
  }
}
main().catch(e => { console.error(e); process.exit(1) })
