import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  // 1) Fix re-introduced casing dupes
  for (const [from, to] of [['LièGe','Liège'], ['Louvain-La-Neuve','Louvain-la-Neuve']]) {
    const { error, count } = await sb.from('places').update({ city: to, updated_at: new Date().toISOString() }, { count: 'exact' }).eq('country','Belgium').is('archived_at', null).eq('city', from)
    console.log(`${from} -> ${to}: ${count} rows ${error ? `ERR ${error.message}` : 'OK'}`)
  }

  // 2) Add Wavre (Wallonia) and Zaventem (Flanders) to region city_names.
  //    Audit any other Belgian cities not yet mapped.
  const { data: cityRows } = await sb.from('places').select('city').eq('country','Belgium').is('archived_at', null).not('city','is',null)
  const cityCounts = new Map<string, number>()
  for (const r of cityRows || []) cityCounts.set(r.city!, (cityCounts.get(r.city!) || 0) + 1)
  const { data: regions } = await sb.from('country_regions').select('region_slug, region_name, city_names').eq('country_slug','belgium').order('sort_order')
  const inRegion = new Set<string>()
  for (const r of regions || []) for (const c of r.city_names as string[]) inRegion.add(c)
  const orphans = [...cityCounts.entries()].filter(([c]) => !inRegion.has(c)).sort((a,b)=>b[1]-a[1])
  console.log('\nOrphan cities (not in any region):')
  for (const [c, n] of orphans) console.log(`  ${c} (${n} places)`)

  // Append known orphans to the right region. Uses postal-code/region knowledge.
  const ASSIGN_TO_FLANDERS = ['Zaventem','Genk','Hasselt','Sint-Niklaas','Aalst','Kortrijk','Ypres','Roeselare','Sint-Andries','Berchem','Diest','Wijnegem','Merelbeke','Wetteren','Heuvelland','Lokeren','Aartrijke','Bredene','Lanaken','Diksmuide','Geraardsbergen','Halle','Ronse','Tienen','Vilvoorde','Beveren','Wavre Nord']
  const ASSIGN_TO_WALLONIA = ['Wavre','Mons','Namur','Charleroi','Tournai','Verviers','La Louvière','Mouscron','Seraing','Profondeville','Couillet','Gilly','Gerpinnes','Saint-Hubert','Spa']
  const flanders = (regions || []).find(r => r.region_slug === 'flanders')
  const wallonia = (regions || []).find(r => r.region_slug === 'wallonia')
  if (flanders) {
    const merged = Array.from(new Set([...(flanders.city_names as string[]), ...ASSIGN_TO_FLANDERS])).sort((a,b)=>a.localeCompare(b))
    await sb.from('country_regions').update({ city_names: merged }).eq('country_slug','belgium').eq('region_slug','flanders')
    console.log(`\nFlanders city_names: ${flanders.city_names.length} -> ${merged.length}`)
  }
  if (wallonia) {
    const merged = Array.from(new Set([...(wallonia.city_names as string[]), ...ASSIGN_TO_WALLONIA])).sort((a,b)=>a.localeCompare(b))
    await sb.from('country_regions').update({ city_names: merged }).eq('country_slug','belgium').eq('region_slug','wallonia')
    console.log(`Wallonia city_names: ${wallonia.city_names.length} -> ${merged.length}`)
  }

  const { error } = await sb.rpc('refresh_directory_views')
  console.log('refresh:', error ? error.message : 'OK')
}
main()
