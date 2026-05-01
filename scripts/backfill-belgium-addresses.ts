/**
 * Reverse-geocode places.address for Belgium rows that have lat/lon but
 * no street address. Uses OpenStreetMap Nominatim (free, no API key,
 * 1 req/sec policy with User-Agent).
 *
 * Run: npx tsx scripts/backfill-belgium-addresses.ts
 */
import { config } from 'dotenv'; config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const UA = 'PlantsPack/1.0 (vegan directory; contact@plantspack.com)'

interface NominatimResp {
  address?: {
    house_number?: string
    road?: string
    pedestrian?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    postcode?: string
  }
  display_name?: string
  error?: string
}

function buildAddress(r: NominatimResp): string | null {
  const a = r.address
  if (!a) return r.display_name?.split(',').slice(0, 2).join(', ').trim() || null
  // Prefer "<house_number> <road>" or just road if no number; fall back to
  // the trimmed display_name. Skip suburb/city/postcode — those live in
  // their own DB columns.
  const street = [a.house_number, a.road || a.pedestrian].filter(Boolean).join(' ').trim()
  if (street) return street
  if (r.display_name) return r.display_name.split(',').slice(0, 2).join(', ').trim()
  return null
}

async function reverse(lat: number, lon: number): Promise<NominatimResp | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&accept-language=en&zoom=18`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function main() {
  const { data: rows, error } = await sb
    .from('places')
    .select('id, name, city, latitude, longitude, address')
    .eq('country', 'Belgium')
    .is('archived_at', null)
    .or('address.is.null,address.eq.')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(2000)
  if (error) { console.error(error); return }
  if (!rows) { console.log('no rows'); return }

  console.log(`${rows.length} Belgium places without addresses to backfill\n`)

  let filled = 0, failed = 0
  for (let i = 0; i < rows.length; i++) {
    const p = rows[i]
    const r = await reverse(p.latitude, p.longitude)
    const addr = r ? buildAddress(r) : null
    if (!addr) {
      failed++
      console.log(`  [${i + 1}/${rows.length}] ${p.name} (${p.city}) — no address found`)
      await new Promise(rs => setTimeout(rs, 1100))
      continue
    }
    const { error: upErr } = await sb.from('places').update({ address: addr }).eq('id', p.id)
    if (upErr) { failed++; console.log(`  ${p.name} — update err: ${upErr.message}`); continue }
    filled++
    if (i < 20 || (i + 1) % 25 === 0) {
      console.log(`  [${i + 1}/${rows.length}] ${p.name} → "${addr}"`)
    }
    // Nominatim policy: max 1 req/sec
    await new Promise(rs => setTimeout(rs, 1100))
  }
  console.log(`\n✅ Done. Filled ${filled}, failed ${failed}.`)
}

main().catch(e => { console.error(e); process.exit(1) })
