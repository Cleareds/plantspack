import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Comprehensive local-name → English-name map
const RENAMES: { from: string; to: string; country: string }[] = [
  // Germany
  { from: 'München', to: 'Munich', country: 'Germany' },
  { from: 'Munchen', to: 'Munich', country: 'Germany' },
  { from: 'Köln', to: 'Cologne', country: 'Germany' },
  { from: 'Koln', to: 'Cologne', country: 'Germany' },
  // Spain
  { from: 'Sevilla', to: 'Seville', country: 'Spain' },
  // Portugal
  { from: 'Lisboa', to: 'Lisbon', country: 'Portugal' },
  // Netherlands
  { from: 'Den Haag', to: 'The Hague', country: 'Netherlands' },
  // Belgium
  { from: 'Bruxelles', to: 'Brussels', country: 'Belgium' },
  { from: 'Brussel', to: 'Brussels', country: 'Belgium' },
  { from: 'Antwerpen', to: 'Antwerp', country: 'Belgium' },
  { from: 'Gent', to: 'Ghent', country: 'Belgium' },
  { from: 'Brugge', to: 'Bruges', country: 'Belgium' },
  // Switzerland
  { from: 'Zürich', to: 'Zurich', country: 'Switzerland' },
  { from: 'Genève', to: 'Geneva', country: 'Switzerland' },
  { from: 'Genf', to: 'Geneva', country: 'Switzerland' },
  { from: 'Berne', to: 'Bern', country: 'Switzerland' },
  { from: 'Luzern', to: 'Lucerne', country: 'Switzerland' },
  // Czech Republic
  { from: 'Praha', to: 'Prague', country: 'Czech Republic' },
  { from: 'Brno', to: 'Brno', country: 'Czech Republic' }, // already English
  // Poland
  { from: 'Warszawa', to: 'Warsaw', country: 'Poland' },
  { from: 'Kraków', to: 'Krakow', country: 'Poland' },
  { from: 'Krakow', to: 'Krakow', country: 'Poland' }, // no-op, just check
  { from: 'Wrocław', to: 'Wroclaw', country: 'Poland' },
  { from: 'Gdańsk', to: 'Gdansk', country: 'Poland' },
  { from: 'Łódź', to: 'Lodz', country: 'Poland' },
  { from: 'Poznań', to: 'Poznan', country: 'Poland' },
  { from: 'Szczecin', to: 'Szczecin', country: 'Poland' }, // no-op
  // Romania
  { from: 'București', to: 'Bucharest', country: 'Romania' },
  { from: 'Bucuresti', to: 'Bucharest', country: 'Romania' },
  // Serbia
  { from: 'Beograd', to: 'Belgrade', country: 'Serbia' },
  // Greece
  { from: 'Αθήνα', to: 'Athens', country: 'Greece' },
  { from: 'Athína', to: 'Athens', country: 'Greece' },
  { from: 'Θεσσαλονίκη', to: 'Thessaloniki', country: 'Greece' },
  // Turkey
  { from: 'İzmir', to: 'Izmir', country: 'Turkey' },
  { from: 'Ankara', to: 'Ankara', country: 'Turkey' }, // no-op
  // Denmark
  { from: 'København', to: 'Copenhagen', country: 'Denmark' },
  { from: 'Kobenhavn', to: 'Copenhagen', country: 'Denmark' },
  // Sweden
  { from: 'Göteborg', to: 'Gothenburg', country: 'Sweden' },
  { from: 'Goteborg', to: 'Gothenburg', country: 'Sweden' },
  { from: 'Malmö', to: 'Malmo', country: 'Sweden' },
  // Iceland
  { from: 'Reykjavík', to: 'Reykjavik', country: 'Iceland' },
  // Latvia
  { from: 'Rīga', to: 'Riga', country: 'Latvia' },
  // Russia
  { from: 'Moskva', to: 'Moscow', country: 'Russia' },
  { from: 'Sankt-Peterburg', to: 'Saint Petersburg', country: 'Russia' },
  { from: 'Saint-Petersburg', to: 'Saint Petersburg', country: 'Russia' },
  // Ukraine
  { from: 'Kiev', to: 'Kyiv', country: 'Ukraine' },
  { from: 'Lviv', to: 'Lviv', country: 'Ukraine' }, // no-op
  { from: 'Харків', to: 'Kharkiv', country: 'Ukraine' },
  { from: 'Kharkiv', to: 'Kharkiv', country: 'Ukraine' }, // no-op
  // Israel
  { from: 'Yerushalayim', to: 'Jerusalem', country: 'Israel' },
  { from: 'Tel-Aviv', to: 'Tel Aviv', country: 'Israel' },
  // Moldova
  { from: 'Chișinău', to: 'Chisinau', country: 'Moldova' },
  { from: 'Chisinau', to: 'Chisinau', country: 'Moldova' }, // no-op
  // Albania
  { from: 'Tiranë', to: 'Tirana', country: 'Albania' },
  // Lithuania
  { from: 'Vilnius', to: 'Vilnius', country: 'Lithuania' }, // no-op
]

async function main() {
  // Only check non-no-ops
  const toCheck = RENAMES.filter(r => r.from !== r.to)
  
  const changes: typeof RENAMES = []
  for (const r of toCheck) {
    const { data } = await sb.from('places').select('id').eq('city', r.from).eq('country', r.country).is('archived_at', null).limit(1)
    if (data && data.length > 0) changes.push(r)
  }
  
  if (changes.length === 0) {
    console.log('No local-name city variants found!')
  } else {
    console.log('Found city variants to fix:')
    for (const r of changes) {
      const { data } = await sb.from('places').select('id').eq('city', r.from).eq('country', r.country).is('archived_at', null)
      console.log(`  ${r.country}: "${r.from}" → "${r.to}" (${data?.length} places)`)
    }
  }

  // Also scan for any non-Latin city names (could be Cyrillic, Arabic, Chinese etc.)
  const { data: allCities } = await sb.from('directory_cities').select('city,country,place_count')
  const nonLatin = (allCities || []).filter(c => /[^\x00-\x7FÀ-öø-ÿ]/.test(c.city))
  if (nonLatin.length > 0) {
    console.log('\nNon-Latin city names:')
    nonLatin.forEach(c => console.log(`  ${c.country}: "${c.city}" (${c.place_count} places)`))
  }
}
main()
