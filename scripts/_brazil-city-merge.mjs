import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const merges = [
  ['Sao Jose Dos Campos','Sao Jose dos Campos'],
  ['Caxias Do Sul','Caxias do Sul'],
  ['Rio De Janeiro','Rio de Janeiro'],
]
for (const [from, to] of merges) {
  const { data: rows } = await sb.from('places').select('id').eq('country','Brazil').eq('city',from)
  console.log(`${from} → ${to}: ${rows?.length||0}`)
  if (rows?.length) {
    const { error } = await sb.from('places').update({ city: to }).eq('country','Brazil').eq('city',from)
    console.log(error?`✗ ${error.message}`:'✓ migrated')
  }
}
