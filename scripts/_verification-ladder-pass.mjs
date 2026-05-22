// Upgrade verification_level for this session's rows that meet quality criteria.
// Logic:
//  - L3 (admin-reviewed) = baseline for add-place imports
//  - L4 (curator-verified) = has image + (address OR coords) + clear FV label from research
//  - L5 (community-verified) = also has website + phone (full contact info)
//
// We only act on rows tagged from this session (source = 'manual-2026-05-16' or tag
// containing 'tier2_', 'summer_hub_', 'osm_import', 'brazil_', 'latam_', 'bcn_',
// 'berlin_'), and we never downgrade.
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const SESSION_TAGS = ['tier2_', 'summer_hub_', 'brazil_', 'latam_', 'bcn_', 'berlin_', 'osm_import']
const SESSION_VERIFICATION_METHODS = [
  'manual-2026-05-16', 'manual-2026-05-17',
  'tier2_2026_05', 'tier2_b2_2026_05', 'tier2_b3_2026_05', 'tier2_b4_2026_05', 'tier2_b5_2026_05', 'tier2_b6_2026_05', 'tier2_b7_2026_05', 'tier2_b8_2026_05', 'tier2_b9_2026_05',
  'summer_hub_2026_05', 'summer_hub_b2_2026_05', 'summer_hub_b3_2026_05', 'summer_hub_b4_2026_05', 'summer_hub_b5_2026_05', 'summer_hub_b6_2026_05', 'summer_hub_b7_2026_05', 'summer_hub_b8_2026_05', 'summer_hub_b9_2026_05',
  'brazil_2026_05', 'latam_2026_05', 'bcn_round2_2026_05', 'berlin_sweep_2026_05',
]

const rows = []
let from = 0
while (true) {
  const { data, error } = await sb.from('places')
    .select('id, name, country, city, vegan_level, verification_level, verification_method, main_image_url, address, latitude, longitude, website, phone, opening_hours, source')
    .eq('vegan_level', 'fully_vegan')
    .is('archived_at', null)
    .or(`verification_method.in.(${SESSION_VERIFICATION_METHODS.map(m => `"${m}"`).join(',')}),source.in.(${SESSION_VERIFICATION_METHODS.map(m => `"${m}"`).join(',')})`)
    .order('id')
    .range(from, from + 999)
  if (error) { console.error(error); break }
  if (!data?.length) break
  rows.push(...data); if (data.length < 1000) break; from += 1000
}
console.log(`Session FV rows: ${rows.length}`)

const promotions = { 3: [], 4: [], 5: [] }
for (const r of rows) {
  const has_image = !!r.main_image_url
  const has_coords = r.latitude != null && r.longitude != null
  const has_address = r.address && r.address.length > 8
  const has_website = !!r.website
  const has_phone = !!r.phone
  const has_hours = !!r.opening_hours
  const cur = r.verification_level ?? 2

  let target = cur
  if (has_image && (has_coords || has_address)) target = Math.max(target, 4)
  if (has_image && has_coords && has_address && has_website && (has_phone || has_hours)) target = Math.max(target, 5)
  if (target > cur) promotions[target].push(r)
}

console.log(`Promote to L4: ${promotions[4].length}`)
console.log(`Promote to L5: ${promotions[5].length}`)

let ok4 = 0, ok5 = 0, fail = 0
for (const r of promotions[4]) {
  const { error } = await sb.from('places').update({ verification_level: 4, last_verified_at: new Date().toISOString() }).eq('id', r.id)
  if (error) fail++; else ok4++
}
for (const r of promotions[5]) {
  const { error } = await sb.from('places').update({ verification_level: 5, last_verified_at: new Date().toISOString() }).eq('id', r.id)
  if (error) fail++; else ok5++
}
console.log(`Applied L4: ${ok4}, L5: ${ok5}, failed: ${fail}`)
