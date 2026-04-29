import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const { data } = await sb.from('directory_cities').select('city,country,place_count').order('country').order('city')

  // Build a map: for each country, group cities by normalised name (lowercase, remove accents roughly)
  const normalize = (s: string) => s.toLowerCase()
    .replace(/[àáâã]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/[ý]/g, 'y')
    .replace(/[ñ]/g, 'n').replace(/[ç]/g, 'c').replace(/[ß]/g, 'ss')
    .replace(/[-\s]/g, '')

  const byCountryNorm: Record<string, Record<string, any[]>> = {}
  for (const row of (data || [])) {
    const key = row.country
    if (!byCountryNorm[key]) byCountryNorm[key] = {}
    const norm = normalize(row.city)
    if (!byCountryNorm[key][norm]) byCountryNorm[key][norm] = []
    byCountryNorm[key][norm].push(row)
  }

  const dupes: any[] = []
  for (const [country, norms] of Object.entries(byCountryNorm)) {
    for (const [norm, group] of Object.entries(norms)) {
      if (group.length > 1) {
        dupes.push({ country, variants: group.map(g => `${g.city} (${g.place_count})`).join(' vs ') })
      }
    }
  }

  if (dupes.length === 0) console.log('No normalised-name dupes found')
  else dupes.forEach(d => console.log(`  ${d.country}: ${d.variants}`))
}
main()
