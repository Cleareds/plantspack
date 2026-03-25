/**
 * Fix missing street addresses + remove true duplicates
 * Usage: npx tsx scripts/fix-addresses-dedup.ts [--dry-run]
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')
const UA = 'PlantsPack-Verifier/1.0 (+https://plantspack.com)'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function reverseGeocode(lat: number, lon: number) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1`
    const resp = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) })
    if (!resp.ok) return null
    const data = await resp.json()
    const a = data.address || {}
    const street = [a.house_number, a.road || a.pedestrian || a.footway].filter(Boolean).join(' ')
    const city = a.city || a.town || a.village || ''
    const postcode = a.postcode || ''
    const country = a.country || ''
    return { fullAddress: [street, city, postcode, country].filter(Boolean).join(', '), street, city, postcode }
  } catch { return null }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function main() {
  console.log(`🌿 Address Fix & Dedup — ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}\n`)

  // Fetch all places
  const allPlaces: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabase.from('places').select('id, name, address, city, country, latitude, longitude, created_at').range(from, from + 999)
    if (!data || data.length === 0) break
    allPlaces.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  console.log(`Loaded ${allPlaces.length} places`)

  // ═══ Step 1: Fix addresses ═══
  const needsAddress = allPlaces.filter(p => {
    const parts = (p.address || '').split(',').map((s: string) => s.trim())
    return parts.length <= 2 || (p.address || '').length < 15
  })
  console.log(`${needsAddress.length} places need address enrichment`)

  let fixed = 0
  for (let i = 0; i < needsAddress.length; i++) {
    const p = needsAddress[i]
    const geo = await reverseGeocode(p.latitude, p.longitude)
    if (geo && geo.street && geo.fullAddress.length > (p.address || '').length + 5) {
      if (!DRY_RUN) {
        const update: any = { address: geo.fullAddress }
        if (geo.city && (!p.city || p.city.length < geo.city.length)) update.city = geo.city
        await supabase.from('places').update(update).eq('id', p.id)
      }
      fixed++
    }
    if ((i + 1) % 50 === 0) process.stdout.write(`\r  ${i + 1}/${needsAddress.length} (${fixed} fixed)`)
    await sleep(1100) // Nominatim rate limit
  }
  console.log(`\nFixed ${fixed} addresses`)

  // ═══ Step 2: Deduplicate ═══
  console.log('\n═══ Deduplication ═══')
  const nameGroups: Record<string, any[]> = {}
  for (const p of allPlaces) {
    const key = (p.name || '').toLowerCase().trim()
    if (!nameGroups[key]) nameGroups[key] = []
    nameGroups[key].push(p)
  }

  const toDelete: any[] = []
  for (const group of Object.values(nameGroups)) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const dist = haversine(group[i].latitude, group[i].longitude, group[j].latitude, group[j].longitude)
        if (dist < 50) {
          const remove = (group[i].address || '').length >= (group[j].address || '').length ? group[j] : group[i]
          if (!toDelete.find(d => d.id === remove.id)) toDelete.push(remove)
        }
      }
    }
  }

  console.log(`${toDelete.length} true duplicates (same name within 50m)`)
  toDelete.slice(0, 15).forEach(p => console.log(`  ${p.name} (${p.city}) — "${p.address}"`))

  if (!DRY_RUN && toDelete.length > 0) {
    for (const p of toDelete) await supabase.from('places').delete().eq('id', p.id)
    console.log(`Deleted ${toDelete.length}`)
    await supabase.rpc('refresh_directory_views')
    console.log('Views refreshed')
  }

  console.log(`\n✅ Fixed: ${fixed} | Dupes: ${DRY_RUN ? toDelete.length + ' (would remove)' : toDelete.length + ' removed'} | Final: ${allPlaces.length - toDelete.length}`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
