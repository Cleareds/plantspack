import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  // Get all city/country combos from directory_cities
  const { data } = await sb.from('directory_cities').select('city,country,place_count,city_slug').order('country').order('city')
  
  // Group by country and find cities with same slug (different capitalisation/spelling)
  const byCountry: Record<string, any[]> = {}
  for (const row of (data || [])) {
    const key = row.country
    if (!byCountry[key]) byCountry[key] = []
    byCountry[key].push(row)
  }

  // Find potential dupes: same slug or suspiciously similar names
  const dupes: any[] = []
  for (const [country, cities] of Object.entries(byCountry)) {
    const slugMap: Record<string, any[]> = {}
    for (const c of cities) {
      const slug = c.city_slug || c.city.toLowerCase().replace(/\s+/g, '-')
      if (!slugMap[slug]) slugMap[slug] = []
      slugMap[slug].push(c)
    }
    for (const [slug, group] of Object.entries(slugMap)) {
      if (group.length > 1) dupes.push({ country, slug, variants: group })
    }
  }

  // Also look for known local-name variants
  const localNames: Record<string, string> = {
    'Roma': 'Rome', 'Milano': 'Milan', 'Napoli': 'Naples', 'Firenze': 'Florence',
    'Torino': 'Turin', 'Venezia': 'Venice', 'Köln': 'Cologne', 'München': 'Munich',
    'Wien': 'Vienna', 'Bruxelles': 'Brussels', 'Brussel': 'Brussels',
    'Den Haag': 'The Hague', 'Moskva': 'Moscow', 'Praha': 'Prague',
    'Warszawa': 'Warsaw', 'Kraków': 'Krakow', 'Zürich': 'Zurich',
    'Genève': 'Geneva', 'Athína': 'Athens', 'Barcelona': 'Barcelona',
  }

  const localDupes: any[] = []
  for (const [local, english] of Object.entries(localNames)) {
    const localEntry = data?.find(c => c.city === local)
    const englishEntry = data?.find(c => c.city === english)
    if (localEntry && englishEntry) {
      localDupes.push({ local: localEntry, english: englishEntry })
    } else if (localEntry) {
      localDupes.push({ local: localEntry, english: null, note: `${local} exists but not ${english}` })
    }
  }

  console.log('\n=== SAME-SLUG DUPES ===')
  console.log(JSON.stringify(dupes, null, 2))
  console.log('\n=== LOCAL vs ENGLISH NAME DUPES ===')
  console.log(JSON.stringify(localDupes, null, 2))
}
main()
