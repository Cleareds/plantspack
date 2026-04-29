import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function main() {
  // Check all Rome/Roma variants
  const { data } = await sb.from('places').select('id,name,city,country,vegan_level,archived_at')
    .eq('country','Italy')
    .or('city.ilike.%roma%,city.ilike.%rome%')
    .order('city').order('name')
  
  const grouped: Record<string, any[]> = {}
  for (const p of (data || [])) {
    if (!grouped[p.city]) grouped[p.city] = []
    grouped[p.city].push(p)
  }
  for (const [city, places] of Object.entries(grouped)) {
    console.log(`\n--- ${city} (${places.length}) ---`)
    places.forEach(p => console.log(`  [${p.archived_at ? 'ARCHIVED' : 'ACTIVE'}] ${p.name} | ${p.vegan_level}`))
  }

  // Also check for other Italian city variants
  console.log('\n=== ALL ITALIAN CITIES IN DB ===')
  const { data: cities } = await sb.from('directory_cities').select('city,place_count').eq('country','Italy').order('place_count', {ascending:false})
  cities?.forEach(c => console.log(`  ${c.city}: ${c.place_count}`))
}
main()
