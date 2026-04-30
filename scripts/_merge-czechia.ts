// Merge "Czechia" → "Czech Republic" so OSM CZ imports land under one
// canonical country name. Mirrors the Germany city merge pattern.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const dryRun = process.argv.includes('--dry-run')
  console.log(dryRun ? 'DRY RUN' : 'EXECUTING')

  const { count: before, error: ce } = await sb.from('places').select('id', { count: 'exact', head: true })
    .eq('country', 'Czechia').is('archived_at', null)
  if (ce) throw ce
  console.log(`Czechia rows (active): ${before ?? 0}`)

  const { count: existing } = await sb.from('places').select('id', { count: 'exact', head: true })
    .eq('country', 'Czech Republic').is('archived_at', null)
  console.log(`Czech Republic rows (active): ${existing ?? 0}`)

  if (dryRun) return

  const { error } = await sb.from('places')
    .update({ country: 'Czech Republic', updated_at: new Date().toISOString() })
    .eq('country', 'Czechia')
    .is('archived_at', null)
  if (error) throw error
  console.log(`renamed ${before} rows`)

  console.log('\nRefreshing directory_views MV...')
  const { error: rerr } = await sb.rpc('refresh_directory_views' as any)
  if (rerr) console.warn('refresh failed:', rerr.message)
  else console.log('refreshed')
}
main().catch(e => { console.error(e); process.exit(1) })
