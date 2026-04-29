import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { count: total } = await sb.from('places').select('*', { count: 'exact', head: true })
  const { count: fullyVegan } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('vegan_level', 'fully_vegan')
  const { count: veganFriendly } = await sb.from('places').select('*', { count: 'exact', head: true }).eq('vegan_level', 'vegan_friendly')
  const { count: nullLevel } = await sb.from('places').select('*', { count: 'exact', head: true }).is('vegan_level', null)
  const { count: users } = await sb.from('profiles').select('*', { count: 'exact', head: true })

  const { data: countries } = await sb.from('places').select('country')
  const distinctCountries = new Set((countries || []).map(r => r.country).filter(Boolean)).size
  const { data: cities } = await sb.from('places').select('city, country')
  const distinctCities = new Set((cities || []).map(r => `${r.city}|${r.country}`)).size

  console.log(`Total places:        ${total}`)
  console.log(`  fully_vegan:       ${fullyVegan}`)
  console.log(`  vegan_friendly:    ${veganFriendly}`)
  console.log(`  null vegan_level:  ${nullLevel}`)
  console.log(`  other levels:      ${(total ?? 0) - (fullyVegan ?? 0) - (veganFriendly ?? 0) - (nullLevel ?? 0)}`)
  console.log(`Distinct cities:     ${distinctCities}`)
  console.log(`Distinct countries:  ${distinctCountries}`)
  console.log(`Profiles (users):    ${users}`)
}
main()
