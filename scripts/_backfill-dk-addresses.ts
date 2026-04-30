// Backfill the `address` column for the Denmark batch by re-calling
// Nominatim reverse geocoding (the import only saved the city, dropping
// the rest). Polite 1.2s per request; resumable (skips already-filled rows).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const UA = 'PlantsPack/1.0 (plantspack.com; admin@plantspack.com)'

async function reverseFullAddress(lat: number, lon: number): Promise<string | null> {
  const url = `${NOMINATIM}/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1`
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!resp.ok) return null
    const data = await resp.json()
    const a = data.address || {}
    // Build "house# road, postcode city" - skip empty pieces.
    const street = [a.house_number, a.road].filter(Boolean).join(' ')
    const postCity = [a.postcode, a.city || a.town || a.village || a.suburb || a.municipality].filter(Boolean).join(' ')
    return [street, postCity].filter(s => s && s.length > 1).join(', ') || null
  } catch {
    return null
  }
}

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: places } = await sb.from('places')
    .select('id, name, latitude, longitude, address')
    .eq('source', 'osm-import-2026-04')
    .eq('country', 'Denmark')
    .is('archived_at', null)
    .order('city')

  if (!places) return
  const todo = places.filter(p => !p.address || !p.address.trim() || p.address.trim().length < 5)
  console.log(`Backfilling addresses for ${todo.length} of ${places.length} Denmark places`)

  let ok = 0, fail = 0
  const now = new Date().toISOString()
  for (let i = 0; i < todo.length; i++) {
    const p = todo[i]
    if (!p.latitude || !p.longitude) { fail++; continue }
    const addr = await reverseFullAddress(p.latitude, p.longitude)
    if (addr) {
      await sb.from('places').update({ address: addr, updated_at: now }).eq('id', p.id)
      ok++
    } else {
      fail++
    }
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${todo.length} (ok ${ok}, fail ${fail})`)
    await new Promise(r => setTimeout(r, 1200))
  }
  console.log(`Done: ${ok} addresses written, ${fail} failed`)
}
main().catch(e => { console.error(e); process.exit(1) })
