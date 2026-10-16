// Vegan Van Denver (data-quality 8, 2026-10-15). Dry-run unless --apply.
// - Own site (veganvan.com, visible text) says 5155 E 39th Ave at Park Hill Kitchens; our coords and the
//   OSM node 13673320292 are still at the old 3900 Elati St. New coords from Nominatim (way 231111481).
//   The stale osm_ref is cleared (kept in admin_notes) so the old location is not linked.
// - Duplicate 00b40c0d (vegguide import, city-centroid coords, Facebook link, no reviews, import account)
//   is merged into b73cc540: slug alias + archived_at.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const KEEP = 'b73cc540-00be-4c98-9ef0-e5fcac194d65', DUP = '00b40c0d-a3c5-449d-9c7c-91bbc8738b86'
const { data: rows, error } = await sb.from('places').select('id,name,slug,latitude,longitude,osm_ref,admin_notes,review_count,created_by,archived_at').in('id', [KEEP, DUP])
if (error) throw error
const keep = rows.find(r => r.id === KEEP), dup = rows.find(r => r.id === DUP)
console.log(keep, dup)
if (dup.review_count > 0 || dup.created_by !== 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c') throw new Error('duplicate is protected')
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('reports/dq-2026-10-15/rollback-vegan-van.json', JSON.stringify(rows, null, 1))
let r = await sb.from('places').update({
  latitude: 39.7715006, longitude: -104.9276078, osm_ref: null,
  admin_notes: `${keep.admin_notes}\n[dq-2026-10-15] re-geocoded to 5155 E 39th Ave (Nominatim); old coords ${keep.latitude},${keep.longitude}; osm_ref ${keep.osm_ref} cleared - that OSM node is the old Elati St location. Merged duplicate ${DUP}.`,
}).eq('id', KEEP)
if (r.error) throw r.error
r = await sb.from('place_slug_aliases').upsert({ old_slug: dup.slug, place_id: KEEP }, { onConflict: 'old_slug', ignoreDuplicates: true })
if (r.error) throw r.error
r = await sb.from('places').update({ archived_at: new Date().toISOString(), archived_reason: `duplicate_merged_into:${KEEP}` }).eq('id', DUP)
if (r.error) throw r.error
console.log('APPLIED')
