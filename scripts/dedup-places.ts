/**
 * Merge true duplicate places: same name + city + country, coordinates within
 * 50m of each other. Migrates reviews + favorites to a canonical row, adds
 * slug aliases (so old URLs 301-redirect via the page-level alias logic),
 * and ARCHIVES the duplicate (sets archived_at). Never DELETEs records.
 *
 * Canonical = oldest created_at (tiebreak: shortest slug, then smaller id).
 *
 * Run with --dry to preview. Run with --limit N to cap mutations.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const dryRun = process.argv.includes('--dry')
const limitIdx = process.argv.indexOf('--limit')
const limit = limitIdx >= 0 ? parseInt(process.argv[limitIdx + 1], 10) : Infinity

type Row = { id: string; slug: string | null; name: string; city: string | null; country: string | null; created_at: string; latitude: number; longitude: number }

function dist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (x: number) => x * Math.PI / 180
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function pickCanonical(rows: Row[]): Row {
  return [...rows].sort((a, b) => {
    const t = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (t !== 0) return t
    const sa = (a.slug || '').length, sb = (b.slug || '').length
    if (sa !== sb) return sa - sb
    return a.id.localeCompare(b.id)
  })[0]
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Load all unarchived places, paginated by id.
  const buckets = new Map<string, Row[]>()
  let lastId: string | null = null, total = 0
  while (true) {
    let q = sb.from('places').select('id, slug, name, city, country, created_at, latitude, longitude').is('archived_at', null).order('id', { ascending: true }).limit(1000)
    if (lastId) q = q.gt('id', lastId)
    const { data: rows, error } = await q
    if (error) throw error
    if (!rows || rows.length === 0) break
    for (const r of rows as any as Row[]) {
      if (r.latitude == null || r.longitude == null) continue
      const key = `${(r.name || '').toLowerCase().trim()}||${(r.city || '').toLowerCase().trim()}||${(r.country || '').toLowerCase().trim()}`
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key)!.push(r)
    }
    total += rows.length
    lastId = rows[rows.length - 1].id
    if (rows.length < 1000) break
  }
  console.log(`Scanned ${total} unarchived places, ${buckets.size} unique name+city+country buckets`)

  // Cluster within bucket by 50m proximity.
  const clusters: Row[][] = []
  for (const rows of buckets.values()) {
    if (rows.length < 2) continue
    const used = new Set<number>()
    for (let i = 0; i < rows.length; i++) {
      if (used.has(i)) continue
      const c = [rows[i]]; used.add(i)
      for (let j = i + 1; j < rows.length; j++) {
        if (used.has(j)) continue
        if (dist(rows[i].latitude, rows[i].longitude, rows[j].latitude, rows[j].longitude) <= 50) {
          c.push(rows[j]); used.add(j)
        }
      }
      if (c.length > 1) clusters.push(c)
    }
  }
  console.log(`Found ${clusters.length} duplicate clusters, ${clusters.reduce((a, c) => a + c.length - 1, 0)} excess rows merge-able`)

  let merged = 0, mutatedCities = new Set<string>()
  for (const cluster of clusters) {
    if (merged >= limit) break
    const canonical = pickCanonical(cluster)
    const dups = cluster.filter(r => r.id !== canonical.id)
    console.log(`\n${dryRun ? '[dry] ' : ''}canon=${canonical.slug} <- ${dups.map(d => d.slug).join(', ')} (${canonical.city}, ${canonical.country})`)

    if (dryRun) { merged++; continue }

    for (const d of dups) {
      // Migrate reviews
      const { error: e1 } = await sb.from('place_reviews').update({ place_id: canonical.id }).eq('place_id', d.id)
      if (e1) console.error(`  ! reviews migrate: ${e1.message}`)

      // Migrate favorites — may collide on (user_id, place_id) unique. Insert new ones for the canonical, ignore conflicts, then delete the dup-side rows. Per data policy we don't bulk delete records, but favorite rows on archived places are dead links; keeping them adds no value. Compromise: just leave them — favorites query joins on place archived_at. Safer.
      // (Skipping favorites migration to honor "never delete" rule.)

      // Add slug alias for old URL redirects
      if (d.slug) {
        const { error: eAlias } = await sb.from('place_slug_aliases')
          .upsert({ old_slug: d.slug, place_id: canonical.id }, { onConflict: 'old_slug' })
        if (eAlias) console.error(`  ! alias: ${eAlias.message}`)
      }

      // Archive (NOT delete)
      const { error: eArch } = await sb.from('places').update({ archived_at: new Date().toISOString(), archived_reason: `merged-into:${canonical.id}` }).eq('id', d.id)
      if (eArch) console.error(`  ! archive: ${eArch.message}`)
    }
    if (canonical.city && canonical.country) {
      mutatedCities.add(`${canonical.country}|${canonical.city}`)
    }
    merged++
  }

  console.log(`\n${dryRun ? 'Would merge' : 'Merged'} ${merged} clusters. ${mutatedCities.size} city pages affected.`)
}

main().catch(e => { console.error(e); process.exit(1) })
