#!/usr/bin/env node
/**
 * READ-ONLY triage of the 452 machine-seeded duplicate pairs. Writes nothing.
 * Buckets each pair by how safe an automatic merge would be.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const norm = s => (s || '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, 'and')
  .replace(/\b(the|le|la|el|il|de|het|een|a|an|restaurant|cafe|caff?e|bar|bistro|kitchen|vegan|veganes|vegano|food|shop|store|gmbh|ltd|bv)\b/g, '')
  .replace(/[^a-z0-9]/g, '')

function dist(a, b, c, d) {
  const R = 6371000, r = x => x * Math.PI / 180
  const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}
function domain(u) {
  if (!u) return null
  try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase() } catch { return null }
}
// Levenshtein-based similarity on the normalised names.
function sim(a, b) {
  if (!a || !b) return 0
  if (a === b) return 1
  const m = a.length, n = b.length
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return 1 - prev[n] / Math.max(m, n)
}

const { data: reports } = await sb.from('place_reports')
  .select('id, place_id, related_place_id, note')
  .eq('type', 'duplicate').eq('status', 'pending').limit(1000)
const auto = reports.filter(r => r.related_place_id)
const ids = [...new Set(auto.flatMap(r => [r.place_id, r.related_place_id]))]

const places = {}
for (let i = 0; i < ids.length; i += 200) {
  const { data } = await sb.from('places')
    .select('id, name, slug, city, country, address, latitude, longitude, website, vegan_level, category, opening_hours, main_image_url, description, is_verified, verification_level, review_count, source, archived_at')
    .in('id', ids.slice(i, i + 200))
  for (const p of data) places[p.id] = p
}

const score = p => (p.review_count || 0) * 100 + (p.is_verified ? 40 : 0) + (p.verification_level || 0) * 5 +
  (p.website ? 8 : 0) + (p.opening_hours ? 5 : 0) + (p.main_image_url ? 4 : 0) +
  (p.description && p.description.length > 20 ? 2 : 0) + (p.address && p.address.length > 12 ? 3 : 0)

const buckets = { gone: [], reviews: [], sameDomain: [], strongName: [], mediumName: [], differentName: [], farApart: [] }
for (const r of auto) {
  const a = places[r.place_id], b = places[r.related_place_id]
  if (!a || !b) { buckets.gone.push({ r }); continue }
  if (a.archived_at || b.archived_at) { buckets.gone.push({ r, a, b }); continue }
  const d = dist(a.latitude, a.longitude, b.latitude, b.longitude)
  const s = sim(norm(a.name), norm(b.name))
  const da = domain(a.website), db = domain(b.website)
  const rec = { r, a, b, d, s, sameDom: !!(da && db && da === db), diffDom: !!(da && db && da !== db) }
  if ((a.review_count || 0) > 0 && (b.review_count || 0) > 0) buckets.reviews.push(rec)
  else if (rec.sameDom && d < 500) buckets.sameDomain.push(rec)
  else if (rec.diffDom) buckets.differentName.push(rec)
  else if (s >= 0.85 && d <= 150) buckets.strongName.push(rec)
  else if (s >= 0.6 && d <= 300) buckets.mediumName.push(rec)
  else if (d > 300) buckets.farApart.push(rec)
  else buckets.differentName.push(rec)
}

console.log(`${auto.length} machine-seeded pairs\n`)
for (const [k, v] of Object.entries(buckets)) console.log(`  ${k.padEnd(16)} ${v.length}`)
for (const [k, v] of Object.entries(buckets)) {
  if (!v.length || k === 'gone') continue
  console.log(`\n--- ${k} (showing up to 8) ---`)
  for (const x of v.slice(0, 8)) {
    console.log(`  sim=${x.s?.toFixed(2)} ${String(x.d).padStart(5)}m  "${x.a.name}" (${x.a.city}) [rev=${x.a.review_count},L${x.a.verification_level}] ${x.a.website || '-'}`)
    console.log(`  ${' '.repeat(13)}  "${x.b.name}" (${x.b.city}) [rev=${x.b.review_count},L${x.b.verification_level}] ${x.b.website || '-'}`)
    console.log(`               keep -> ${score(x.a) >= score(x.b) ? x.a.name : x.b.name}`)
  }
}
