import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  // Bistro Tilo dupes
  const { data: tilo } = await sb.from('places').select('id, slug, name, city, country, address, latitude, longitude, archived_at, source, source_id, vegan_level').ilike('name','%tilo%').or('city.eq.Retie,address.ilike.%retie%')
  console.log(`Bistro Tilo / Retie matches: ${tilo?.length || 0}`)
  for (const r of tilo || []) console.log(`  ${r.archived_at ? '[ARCH]':'[OK]'} ${r.name?.padEnd(20)} ${r.city?.padEnd(15) || '?'} src=${r.source} sid=${r.source_id || '-'} addr="${(r.address||'').slice(0,60)}" lat=${r.latitude} lng=${r.longitude} ${r.slug}`)
  console.log()
  // Also fetch the canonical bistro-tilo-retie ID
  const { data: canon } = await sb.from('places').select('id, latitude, longitude').eq('slug','bistro-tilo-retie').maybeSingle()
  if (canon) {
    const { data: nearby } = await sb.from('places').select('id, slug, name, city, latitude, longitude').is('archived_at', null).gte('latitude', canon.latitude - 0.001).lte('latitude', canon.latitude + 0.001).gte('longitude', canon.longitude - 0.001).lte('longitude', canon.longitude + 0.001)
    console.log(`Places within ~100m of bistro-tilo-retie: ${nearby?.length || 0}`)
    for (const r of nearby || []) console.log(`  ${r.name?.padEnd(20)} ${r.city?.padEnd(15) || '?'} ${r.slug}`)
  }
  // Is Turnhout in any region?
  const { data: regs } = await sb.from('country_regions').select('region_slug, city_names').eq('country_slug','belgium')
  for (const r of regs || []) console.log(`  ${r.region_slug}: has Turnhout? ${(r.city_names as string[]).includes('Turnhout')}`)
}
main()
