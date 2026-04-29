// Merge German city name variants to canonical forms.
// - Köln/Koln → Cologne
// - Nürnberg → Nuremberg
// - Hannover ← Hanover (use German spelling, the more common in our DB)
// - Brunswick → Braunschweig
// - Frankfurt am Main → "Frankfurt am Main" (canonical) + bare "Frankfurt"
//   rows that are clearly Frankfurt am Main by coords. Stragglers near
//   Frankfurt (Oder) get moved to "Frankfurt (Oder)".
// - Halle (Saale) ← Halle (rows near 51.49N, 11.97E) — others to "Halle (Westfalen)"
// - Münster ← Munster (rows near 51.96N, 7.63E) — others left alone
// - Würzburg ← Wurzburg
// - Tübingen ← Tubingen
// - Saarbrücken ← Saarbrucken
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const dryRun = process.argv.includes('--dry-run')
  console.log(dryRun ? 'DRY RUN' : 'EXECUTING')

  let updated = 0

  async function renameAll(from: string, to: string) {
    const { count, error } = await sb.from('places')
      .select('id', { count: 'exact', head: true })
      .eq('country', 'Germany').eq('city', from).is('archived_at', null)
    if (error) throw error
    console.log(`  ${from} (${count}) → ${to}`)
    if (!count || dryRun) return
    const { error: upErr } = await sb.from('places').update({ city: to, updated_at: new Date().toISOString() })
      .eq('country', 'Germany').eq('city', from).is('archived_at', null)
    if (upErr) throw upErr
    updated += count
  }

  // Box-filter rename: rename rows in (city=fromCity) whose lat/lng falls inside the box → toCity.
  // Rows outside the box go to outsideTo.
  async function renameByBox(fromCity: string, box: { latMin: number; latMax: number; lngMin: number; lngMax: number }, insideTo: string, outsideTo: string) {
    const { data, error } = await sb.from('places')
      .select('id, latitude, longitude').eq('country', 'Germany').eq('city', fromCity).is('archived_at', null)
    if (error) throw error
    const inside: string[] = []
    const outside: string[] = []
    for (const r of data || []) {
      const lat = r.latitude as number | null, lng = r.longitude as number | null
      if (lat == null || lng == null) { outside.push(r.id); continue }
      if (lat >= box.latMin && lat <= box.latMax && lng >= box.lngMin && lng <= box.lngMax) inside.push(r.id)
      else outside.push(r.id)
    }
    console.log(`  ${fromCity}: ${inside.length} → ${insideTo}, ${outside.length} → ${outsideTo}`)
    if (dryRun) return
    if (inside.length) {
      const { error: e } = await sb.from('places').update({ city: insideTo, updated_at: new Date().toISOString() }).in('id', inside)
      if (e) throw e
      updated += inside.length
    }
    if (outside.length && outsideTo !== fromCity) {
      const { error: e } = await sb.from('places').update({ city: outsideTo, updated_at: new Date().toISOString() }).in('id', outside)
      if (e) throw e
      updated += outside.length
    }
  }

  console.log('\n--- Simple renames ---')
  await renameAll('Koln', 'Cologne')
  await renameAll('Nürnberg', 'Nuremberg')
  await renameAll('Hanover', 'Hannover')
  await renameAll('Brunswick', 'Braunschweig')
  await renameAll('Wurzburg', 'Würzburg')
  await renameAll('Tubingen', 'Tübingen')
  await renameAll('Saarbrucken', 'Saarbrücken')

  console.log('\n--- Coord-bounded renames ---')
  // Frankfurt am Main: 50.05–50.20N, 8.50–8.80E
  await renameByBox('Frankfurt', { latMin: 50.0, latMax: 50.3, lngMin: 8.4, lngMax: 8.9 }, 'Frankfurt am Main', 'Frankfurt (Oder)')
  // Halle (Saale): 51.40–51.60N, 11.80–12.10E. Outliers (Halle Westfalen ~52.06N) → "Halle (Westfalen)"
  await renameByBox('Halle', { latMin: 51.3, latMax: 51.7, lngMin: 11.6, lngMax: 12.2 }, 'Halle (Saale)', 'Halle (Westfalen)')
  // Münster (NRW): ~51.96N, ~7.63E. Outliers stay as "Munster" (Munster, Niedersachsen / others)
  await renameByBox('Munster', { latMin: 51.8, latMax: 52.1, lngMin: 7.4, lngMax: 7.9 }, 'Münster', 'Munster')

  console.log(`\nTotal rows updated: ${updated}`)

  if (!dryRun) {
    console.log('\nRefreshing directory_cities MV...')
    const { error } = await sb.rpc('refresh_directory_views' as any)
    if (error) console.warn('refresh_directory_views RPC failed:', error.message)
    else console.log('directory_cities refreshed')
  }
}
main().catch(e => { console.error(e); process.exit(1) })
