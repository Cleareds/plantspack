import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Variants to look for globally (not just Belgium). Each entry: canonical
// English name first, then known foreign-language variants. Source: ISO,
// Wikipedia "list of European exonyms".
const VARIANTS: Array<{ canonical: string; variants: string[]; country?: string }> = [
  // Italy
  { canonical: 'Rome',     variants: ['Roma'],     country: 'Italy' },
  { canonical: 'Milan',    variants: ['Milano'],   country: 'Italy' },
  { canonical: 'Florence', variants: ['Firenze'],  country: 'Italy' },
  { canonical: 'Venice',   variants: ['Venezia'],  country: 'Italy' },
  { canonical: 'Naples',   variants: ['Napoli'],   country: 'Italy' },
  { canonical: 'Turin',    variants: ['Torino'],   country: 'Italy' },
  { canonical: 'Genoa',    variants: ['Genova'],   country: 'Italy' },
  { canonical: 'Padua',    variants: ['Padova'],   country: 'Italy' },
  // Germany
  { canonical: 'Munich',   variants: ['München', 'Munchen'], country: 'Germany' },
  { canonical: 'Cologne',  variants: ['Köln', 'Koln'], country: 'Germany' },
  { canonical: 'Nuremberg',variants: ['Nürnberg', 'Nurnberg'], country: 'Germany' },
  // Austria
  { canonical: 'Vienna',   variants: ['Wien'], country: 'Austria' },
  // Spain
  { canonical: 'Seville',  variants: ['Sevilla'], country: 'Spain' },
  // Portugal
  { canonical: 'Lisbon',   variants: ['Lisboa'], country: 'Portugal' },
  // Netherlands
  { canonical: 'The Hague',variants: ["'s-Gravenhage", 'Den Haag'], country: 'Netherlands' },
  // Czech Republic
  { canonical: 'Prague',   variants: ['Praha'], country: 'Czech Republic' },
  // Poland
  { canonical: 'Warsaw',   variants: ['Warszawa'], country: 'Poland' },
  { canonical: 'Wroclaw',  variants: ['Wrocław'], country: 'Poland' },
  // Switzerland
  { canonical: 'Zurich',   variants: ['Zürich'], country: 'Switzerland' },
  { canonical: 'Geneva',   variants: ['Genève', 'Geneve', 'Genf'], country: 'Switzerland' },
  { canonical: 'Lucerne',  variants: ['Luzern'], country: 'Switzerland' },
  // Romania
  { canonical: 'Bucharest',variants: ['București', 'Bucuresti'], country: 'Romania' },
  // Turkey
  { canonical: 'Izmir',    variants: ['İzmir'], country: 'Turkey' },
  // Vietnam
  { canonical: 'Hanoi',    variants: ['Hà Nội'], country: 'Vietnam' },
  // Belgium dupes already handled, but include for completeness
  { canonical: 'Antwerp',  variants: ['Antwerpen', 'Anvers'], country: 'Belgium' },
  { canonical: 'Ghent',    variants: ['Gent', 'Gand'], country: 'Belgium' },
  { canonical: 'Bruges',   variants: ['Brugge'], country: 'Belgium' },
  { canonical: 'Brussels', variants: ['Bruxelles', 'Brussel'], country: 'Belgium' },
]

async function main() {
  for (const { canonical, variants, country } of VARIANTS) {
    const all = [canonical, ...variants]
    const found: Record<string, number> = {}
    for (const c of all) {
      let q: any = sb.from('places').select('*', { count: 'exact', head: true }).eq('city', c).is('archived_at', null)
      if (country) q = q.eq('country', country)
      const { count } = await q
      if (count && count > 0) found[c] = count
    }
    const cities = Object.keys(found)
    if (cities.length === 0) continue
    if (cities.length === 1 && cities[0] === canonical) continue
    const flag = cities.length > 1 ? 'DUPE' : 'RENAME'
    console.log(`[${flag}] ${country?.padEnd(15) || '?'.padEnd(15)} ${all.join(' / ').padEnd(35)} ${cities.map(c => `${c}=${found[c]}`).join(', ')}`)
  }
}
main()
