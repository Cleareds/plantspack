import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
for (const country of ['Spain', 'Italy']) {
  const { count: fv } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('country', country).eq('vegan_level', 'fully_vegan').is('archived_at', null)
  const { count: mv } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('country', country).eq('vegan_level', 'mostly_vegan').is('archived_at', null)
  const { count: vf } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('country', country).eq('vegan_level', 'vegan_friendly').is('archived_at', null)
  const { count: vo } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('country', country).eq('vegan_level', 'vegan_options').is('archived_at', null)
  console.log(country, { fv, mv, vf, vo })
}
for (const country of ['Spain', 'Italy']) {
  const all = []
  let from = 0
  while (true) {
    const { data } = await sb.from('places').select('city,vegan_level').eq('country', country).is('archived_at', null).range(from, from + 999)
    if (!data?.length) break
    all.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  const fvByCity = {}
  for (const r of all) if (r.vegan_level === 'fully_vegan' && r.city) fvByCity[r.city] = (fvByCity[r.city] || 0) + 1
  const top = Object.entries(fvByCity).sort((a, b) => b[1] - a[1]).slice(0, 20)
  console.log('\n' + country + ' top FV cities:')
  top.forEach(([c, n]) => console.log('  ', c.padEnd(20), n))
}
