import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Canonical = Spanish convention: accents + lowercase "de"
const merges = [
  { country: 'Spain', from: 'Malaga', to: 'Málaga' },
  { country: 'Spain', from: 'Palma De Mallorca', to: 'Palma de Mallorca' },
  { country: 'Spain', from: 'Gijon', to: 'Gijón' },
  { country: 'Spain', from: 'Santa Cruz De Tenerife', to: 'Santa Cruz de Tenerife' },
  { country: 'Spain', from: 'San Cristóbal De La Laguna', to: 'San Cristóbal de La Laguna' },
]

for (const m of merges) {
  const { data: before, error: e1 } = await sb.from('places').select('id').eq('country', m.country).eq('city', m.from).is('archived_at', null)
  if (e1) { console.error(m, e1); continue }
  if (!before?.length) { console.log(`  (0)  "${m.from}" → "${m.to}": nothing to migrate`); continue }
  const { error: e2 } = await sb.from('places').update({ city: m.to }).eq('country', m.country).eq('city', m.from).is('archived_at', null)
  console.log(`  ${e2 ? '✗' : '✓'} ${String(before.length).padStart(3)}  "${m.from}" → "${m.to}"`)
  if (e2) console.error('   ', e2.message)
}
