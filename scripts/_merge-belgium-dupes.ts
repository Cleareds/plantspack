/**
 * Belgium duplicate merges + city normalization from CSV audit (2026-05-08).
 *
 *   1. Arkose Canal: keep 'arkose-canal-brussels' (richer address with postal),
 *      archive 'arkose-canal-schaerbeek'. Same address, same website, postal 1000
 *      = Brussels city not Schaerbeek (1030).
 *   2. Le Coq d'Or: keep 'le-coq-d-or-nivelles', archive 'le-coq-d-or-nivelle'.
 *      Same address, same website, "Nivelles" is the correct French spelling.
 *   3. Huggys Nivelles: city Nivelle -> Nivelles (typo).
 *
 * Forrest & Friends category=organisation was flagged but 'organisation' IS
 * a valid category enum value (animal sanctuary). No change.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const COMMIT = process.argv.includes('--commit')

async function mergeDuplicate(keepSlug: string, removeSlug: string) {
  const [{ data: keep }, { data: remove }] = await Promise.all([
    sb.from('places').select('*').eq('slug', keepSlug).maybeSingle(),
    sb.from('places').select('*').eq('slug', removeSlug).maybeSingle(),
  ])
  if (!keep) { console.log(`MISSING keep: ${keepSlug}`); return }
  if (!remove) { console.log(`MISSING remove: ${removeSlug}`); return }
  console.log(`\nMerge: keep=${keep.id} (${keepSlug})  remove=${remove.id} (${removeSlug})`)

  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const f of ['main_image_url', 'opening_hours', 'phone', 'website', 'description']) {
    const cur = (keep as any)[f]
    const alt = (remove as any)[f]
    if ((cur === null || cur === undefined || (typeof cur === 'string' && cur.trim() === '')) && alt) {
      update[f] = alt
    }
  }
  if (remove.address && (remove.address.length > (keep.address || '').length)) update.address = remove.address
  const keepTags: string[] = keep.tags || []
  const removeTags: string[] = remove.tags || []
  update.tags = Array.from(new Set([...keepTags, ...removeTags, 'merged-from-duplicate']))

  console.log('  fields to update:', Object.keys(update))

  if (!COMMIT) return

  const { error: uerr } = await sb.from('places').update(update).eq('id', keep.id)
  if (uerr) { console.log('  update keep ERR:', uerr.message); return }

  for (const { table, column } of [
    { table: 'place_reviews', column: 'place_id' },
    { table: 'favorite_places', column: 'place_id' },
    { table: 'pack_places', column: 'place_id' },
    { table: 'place_corrections', column: 'place_id' },
  ] as const) {
    const { error } = await sb.from(table).update({ [column]: keep.id }).eq(column, remove.id)
    console.log(`  repoint ${table}:`, error ? `ERR ${error.message}` : 'ok')
  }

  const { error: aerr } = await sb.from('places').update({
    archived_at: new Date().toISOString(),
    archived_reason: `merged into ${keep.id} (Belgium dupe audit 2026-05-08)`,
    updated_at: new Date().toISOString(),
  }).eq('id', remove.id)
  console.log('  archive remove:', aerr ? `ERR ${aerr.message}` : 'ok')
}

async function normalizeCity(slug: string, fromCity: string, toCity: string) {
  const { data } = await sb.from('places').select('id, city').eq('slug', slug).maybeSingle()
  if (!data) { console.log(`MISSING ${slug}`); return }
  if (data.city !== fromCity) { console.log(`${slug}: city already '${data.city}', skip`); return }
  console.log(`Normalize ${slug}: ${fromCity} -> ${toCity}`)
  if (!COMMIT) return
  const { error } = await sb.from('places').update({ city: toCity, updated_at: new Date().toISOString() }).eq('id', data.id)
  console.log('  ', error ? `ERR ${error.message}` : 'ok')
}

async function main() {
  console.log(COMMIT ? 'COMMIT MODE' : 'DRY-RUN')
  await mergeDuplicate('arkose-canal-brussels', 'arkose-canal-schaerbeek')
  await mergeDuplicate('le-coq-d-or-nivelles', 'le-coq-d-or-nivelle')
  console.log('\n-- City normalizations --')
  await normalizeCity('huggys-nivelles-nivelle', 'Nivelle', 'Nivelles')

  if (COMMIT) {
    const { error } = await sb.rpc('refresh_directory_views')
    console.log('\nrefresh_directory_views:', error ? `ERR ${error.message}` : 'ok')
  }
}
main().catch(e => { console.error(e); process.exit(1) })
