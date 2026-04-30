// Fix country-name oddities flagged in the audit:
// - "Italia" -> "Italy" (1 row in Sirmione)
// - "Ivory Coast" -> "Côte d'Ivoire" (1 row, the canonical English form is
//   already used for the other 2 entries in the DB)
// - "Laramie" -> country "United States" (1 row, Laramie is a city not a country)
// - "Marktheidenfeld-Altfeld" -> country "Germany" (2 rows, ditto - it's a Bavarian town)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const dryRun = process.argv.includes('--dry-run')
  console.log(dryRun ? 'DRY RUN' : 'EXECUTING')

  const fixes: Array<{ from: string; to: string; keepCity: boolean }> = [
    { from: 'Italia', to: 'Italy', keepCity: true },
    { from: 'Ivory Coast', to: "Côte d'Ivoire", keepCity: true },
    { from: 'Laramie', to: 'United States', keepCity: true },
    { from: 'Marktheidenfeld-Altfeld', to: 'Germany', keepCity: true },
  ]

  let total = 0
  for (const f of fixes) {
    const { count } = await sb.from('places').select('id', { count: 'exact', head: true })
      .eq('country', f.from).is('archived_at', null)
    console.log(`  ${f.from} (${count}) -> country: ${f.to}`)
    if (!count || dryRun) continue
    const { error } = await sb.from('places')
      .update({ country: f.to, updated_at: new Date().toISOString() })
      .eq('country', f.from).is('archived_at', null)
    if (error) console.error(`  FAIL: ${error.message}`)
    else total += count
  }

  console.log(`\nTotal rows updated: ${total}`)
  if (!dryRun) {
    console.log('Refreshing directory_views...')
    const { error } = await sb.rpc('refresh_directory_views' as any)
    if (error) console.warn('refresh failed:', error.message)
    else console.log('refreshed')
  }
}
main().catch(e => { console.error(e); process.exit(1) })
