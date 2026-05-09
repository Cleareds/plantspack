import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const COMMIT = process.argv.includes('--commit')

const RENAMES: Array<{ from: string; to: string }> = [
  { from: 'Oostende', to: 'Ostend' },
  { from: 'Ostende',  to: 'Ostend' },
  { from: 'Ieper',    to: 'Ypres' },
]

async function main() {
  console.log(COMMIT ? 'COMMIT' : 'DRY-RUN')
  for (const r of RENAMES) {
    const { data: rows } = await sb.from('places').select('id, name, slug').eq('country','Belgium').is('archived_at', null).eq('city', r.from)
    if (!rows || rows.length === 0) { console.log(`  ${r.from}: 0 rows`); continue }
    console.log(`\n  ${r.from} -> ${r.to}: ${rows.length} rows`)
    for (const x of rows) console.log(`    - ${x.name} (${x.slug})`)
    if (!COMMIT) continue
    const { error } = await sb.from('places').update({ city: r.to, updated_at: new Date().toISOString() }).eq('country','Belgium').is('archived_at', null).eq('city', r.from)
    if (error) console.log(`    ERR: ${error.message}`)
    else console.log(`    OK`)
  }
  if (COMMIT) {
    const { error } = await sb.rpc('refresh_directory_views')
    console.log('\nrefresh_directory_views:', error ? `ERR ${error.message}` : 'ok')
  }
}
main().catch(e => { console.error(e); process.exit(1) })
