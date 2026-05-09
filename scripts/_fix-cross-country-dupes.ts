import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const RENAMES = [
  { country: 'Italy', from: 'Padova',  to: 'Padua' },
  { country: 'Spain', from: 'Sevilla', to: 'Seville' },
]

async function main() {
  for (const r of RENAMES) {
    const { data: rows } = await sb.from('places').select('id, name, slug').eq('country', r.country).is('archived_at', null).eq('city', r.from)
    console.log(`${r.country} ${r.from} -> ${r.to}: ${rows?.length || 0} rows`)
    if (!rows || rows.length === 0) continue
    const { error } = await sb.from('places').update({ city: r.to, updated_at: new Date().toISOString() }).eq('country', r.country).is('archived_at', null).eq('city', r.from)
    if (error) console.log(`  ERR: ${error.message}`)
    else console.log(`  OK`)
  }
  const { error } = await sb.rpc('refresh_directory_views')
  console.log('refresh_directory_views:', error ? `ERR ${error.message}` : 'ok')
}
main()
