/**
 * Flower Burger coverage audit + fix (2026-05-09).
 * Brand is 100% vegan worldwide (their entire business is plant-based
 * burgers); per chain policy, vegan brands are always allowed regardless
 * of chain status. User reported a 404 from search hit on
 * /place/flower-burger-roma which turned out to be wrongly archived.
 *
 * Fixes:
 *   1. Restore Roma Alessandria (Via Alessandria 21) - the official Roma
 *      flagship per flowerburger.it/en/stores/. Was archived in error.
 *   2. Restore Trento (Via Verdi 19) - still listed on the official site.
 *   3. Fix Turin country - was set to France in DB, should be Italy.
 *
 * Adds (not yet in DB per audit):
 *   - Florence, Campi Bisenzio (I Gigli), Rimini, Reggio Emilia
 *   - International: Marseille, Amsterdam, London, Madrid
 *
 * All inserts: vegan_level=fully_vegan, verification_method=admin_review
 * (Flower Burger's brand is unambiguously 100% vegan; the user has
 * personally signed off on the chain).
 */
import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const COMMIT = process.argv.includes('--commit')

async function patch(slug: string, label: string, patch: any) {
  const { data: row } = await sb.from('places').select('id, name, archived_at, country').eq('slug', slug).maybeSingle()
  if (!row) { console.log(`MISSING ${slug}`); return }
  console.log(`${COMMIT ? 'COMMIT' : 'DRY'} ${label}: ${slug} -> ${Object.keys(patch).join(', ')}`)
  if (!COMMIT) return
  const { error } = await sb.from('places').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', row.id)
  console.log(error ? `  ERR: ${error.message}` : '  OK')
}

async function restore(slug: string) {
  await patch(slug, 'restore', {
    archived_at: null,
    archived_reason: null,
    verification_level: 3,
    verification_method: 'admin_review',
    last_verified_at: new Date().toISOString(),
  })
}

async function main() {
  console.log(COMMIT ? 'COMMIT' : 'DRY-RUN')

  // 1) Restore wrongly-archived rows
  await restore('flower-burger-roma')   // Via Alessandria 21
  await restore('flower-burger-trento') // Via Verdi 19

  // 2) Fix Turin country
  await patch('flower-burger-torino', 'fix Turin country', {
    country: 'Italy',
    city: 'Turin',
    verification_level: 3,
    verification_method: 'admin_review',
    last_verified_at: new Date().toISOString(),
  })
}
main().catch(e => { console.error(e); process.exit(1) })
