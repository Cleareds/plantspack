import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  // 1) Merge LièGe casing variant into Liège
  const { data: liegeRows } = await sb.from('places').select('id, slug, name').eq('country','Belgium').is('archived_at', null).eq('city', 'LièGe')
  console.log(`LièGe variant: ${liegeRows?.length || 0} rows -> Liège`)
  for (const r of liegeRows || []) console.log(`  - ${r.name} (${r.slug})`)
  if (liegeRows && liegeRows.length > 0) {
    const { error } = await sb.from('places').update({ city: 'Liège', updated_at: new Date().toISOString() }).eq('country','Belgium').is('archived_at', null).eq('city', 'LièGe')
    console.log(error ? `  ERR: ${error.message}` : '  OK')
  }

  // 2) Update Flanders region city_names: replace Oostende/Ieper with English canonicals
  const { data: flanders } = await sb.from('country_regions').select('city_names').eq('country_slug','belgium').eq('region_slug','flanders').maybeSingle()
  if (flanders) {
    const cn = (flanders.city_names as string[]) || []
    const updated = [...new Set(cn.map(c => c === 'Oostende' ? 'Ostend' : c === 'Ieper' ? 'Ypres' : c))].sort((a, b) => a.localeCompare(b))
    const changed = updated.length !== cn.length || updated.some((v, i) => v !== cn.slice().sort((a,b)=>a.localeCompare(b))[i])
    if (changed) {
      const { error } = await sb.from('country_regions').update({ city_names: updated }).eq('country_slug','belgium').eq('region_slug','flanders')
      console.log('Flanders city_names updated (Oostende->Ostend, Ieper->Ypres):', error ? `ERR ${error.message}` : 'OK')
    } else {
      console.log('Flanders city_names: no change needed')
    }
  }

  // 3) Refresh materialized views (directory_cities + city_scores)
  const { error: rerr } = await sb.rpc('refresh_directory_views')
  console.log('refresh_directory_views:', rerr ? `ERR ${rerr.message}` : 'OK')
}
main().catch(e => { console.error(e); process.exit(1) })
