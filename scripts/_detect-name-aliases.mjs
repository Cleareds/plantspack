import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const aliases = {
  // canonical English form → list of native/aliases that should also be treated as same city
  Italy: [
    { canonical: 'Naples', aliases: ['Napoli'] },
    { canonical: 'Florence', aliases: ['Firenze'] },
    { canonical: 'Venice', aliases: ['Venezia'] },
    { canonical: 'Turin', aliases: ['Torino'] },
    { canonical: 'Genoa', aliases: ['Genova'] },
    { canonical: 'Milan', aliases: ['Milano'] },
    { canonical: 'Rome', aliases: ['Roma'] },
    { canonical: 'Padua', aliases: ['Padova'] },
    { canonical: 'Mantua', aliases: ['Mantova'] },
    { canonical: 'Syracuse', aliases: ['Siracusa'] },
    { canonical: 'Bolzano', aliases: ['Bozen'] },
  ],
  Spain: [
    { canonical: 'Seville', aliases: ['Sevilla'] },
    { canonical: 'Zaragoza', aliases: ['Saragossa'] },
    { canonical: 'A Coruña', aliases: ['La Coruña', 'Corunna', 'A Coruna', 'La Coruna'] },
    { canonical: 'Bilbao', aliases: ['Bilbo'] },
    { canonical: 'San Sebastián', aliases: ['Donostia', 'San Sebastian', 'Donostia-San Sebastián'] },
    { canonical: 'Pamplona', aliases: ['Iruña', 'Iruna'] },
    { canonical: 'Mallorca', aliases: ['Majorca'] },
  ],
}

for (const [country, rules] of Object.entries(aliases)) {
  console.log(`\n=== ${country} ===`)
  for (const rule of rules) {
    const all = [rule.canonical, ...rule.aliases]
    const { data } = await sb.from('places').select('city,vegan_level').eq('country', country).in('city', all).is('archived_at', null)
    if (!data?.length) continue
    const byCity = {}
    for (const r of data) {
      if (!byCity[r.city]) byCity[r.city] = { total: 0, fv: 0 }
      byCity[r.city].total++
      if (r.vegan_level === 'fully_vegan') byCity[r.city].fv++
    }
    const hits = Object.entries(byCity).filter(([n]) => n !== rule.canonical)
    if (!hits.length) continue
    const canonStats = byCity[rule.canonical] || { total: 0, fv: 0 }
    console.log(`  ${rule.canonical} (${canonStats.total}t/${canonStats.fv}fv) + aliases:`)
    for (const [name, stats] of hits) {
      console.log(`    "${name}": ${stats.total}t / ${stats.fv}fv  → merge into "${rule.canonical}"`)
    }
  }
}
