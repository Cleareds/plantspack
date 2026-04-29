import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const merges = [
    // Italy
    { from: 'Roma', to: 'Rome', country: 'Italy' },
    { from: 'Milano', to: 'Milan', country: 'Italy' },
    { from: 'Firenze', to: 'Florence', country: 'Italy' },
    { from: 'Venezia', to: 'Venice', country: 'Italy' },
    { from: 'Napoli', to: 'Naples', country: 'Italy' },
    { from: 'Torino', to: 'Turin', country: 'Italy' },
    // Austria
    { from: 'Wien', to: 'Vienna', country: 'Austria' },
  ]

  for (const { from, to, country } of merges) {
    const { data: count } = await sb.from('places').select('id', { count: 'exact', head: false }).eq('city', from).eq('country', country).is('archived_at', null)
    const n = (count as any[])?.length ?? 0
    if (n > 0) {
      const { error } = await sb.from('places').update({ city: to }).eq('city', from).eq('country', country)
      console.log(`${country}: ${from} → ${to}: ${error ? error.message : `OK (${n} places)` }`)
    } else {
      console.log(`${country}: ${from} → ${to}: 0 places, skip`)
    }
  }

  const { error } = await sb.rpc('refresh_directory_views')
  console.log('Refreshed views:', error ?? 'OK')
}
main()
