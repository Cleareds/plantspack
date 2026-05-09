import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Known Dutch/French/English variants of Belgian cities. Canonical = English.
const VARIANTS: Array<{ canonical: string; variants: string[] }> = [
  { canonical: 'Antwerp',   variants: ['Antwerpen', 'Anvers'] },
  { canonical: 'Ghent',     variants: ['Gent', 'Gand'] },
  { canonical: 'Bruges',    variants: ['Brugge'] },
  { canonical: 'Liège',     variants: ['Liege', 'Luik', 'Lüttich'] },
  { canonical: 'Brussels',  variants: ['Bruxelles', 'Brussel'] },
  { canonical: 'Mons',      variants: ['Bergen'] },
  { canonical: 'Namur',     variants: ['Namen'] },
  { canonical: 'Leuven',    variants: ['Louvain'] },
  { canonical: 'Mechelen',  variants: ['Malines'] },
  { canonical: 'Ostend',    variants: ['Oostende', 'Ostende'] },
  { canonical: 'Tournai',   variants: ['Doornik'] },
  { canonical: 'Aalst',     variants: ['Alost'] },
  { canonical: 'Kortrijk',  variants: ['Courtrai'] },
  { canonical: 'Ypres',     variants: ['Ieper'] },
  { canonical: 'Roeselare', variants: ['Roulers'] },
  { canonical: 'Sint-Niklaas', variants: ['Saint-Nicolas'] },
]

async function main() {
  for (const { canonical, variants } of VARIANTS) {
    const all = [canonical, ...variants]
    const found: Record<string, number> = {}
    for (const c of all) {
      const { count } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('country','Belgium').is('archived_at', null).eq('city', c)
      if (count) found[c] = count
    }
    const cities = Object.keys(found)
    if (cities.length === 0) continue
    if (cities.length === 1 && cities[0] === canonical) continue  // all good
    const flag = cities.includes(canonical) && cities.length > 1 ? 'DUPE!' : 'NEEDS RENAME'
    console.log(`[${flag}] ${all.join(' / ')}: ${cities.map(c => `${c}=${found[c]}`).join(', ')}`)
  }
}
main()
