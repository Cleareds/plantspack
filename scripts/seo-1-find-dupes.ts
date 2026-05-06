/**
 * Find duplicate-slug places (slug ending in -1, -2, ...) that look like true
 * duplicates of an unsuffixed canonical row.
 *
 * Heuristic: a candidate is treated as a duplicate of its "base" only if
 *   - same name (case-insensitive, trimmed)
 *   - same city + country
 *   - haversine distance <= 80m  OR  one side has no coords
 *
 * Otherwise the suffix slug is kept (legitimate chain branch / different spot).
 *
 * Output: scripts/seo-out/duplicates.json with two arrays:
 *   - confirmed:   safe to archive the suffixed row
 *   - ambiguous:   needs human eyes (different coords, missing data, etc.)
 *
 * NEVER archives anything by itself. Only writes the report.
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Row = {
  id: string
  slug: string
  name: string
  city: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  vegan_level: string | null
  source: string | null
  source_id: string | null
  description: string | null
  main_image_url: string | null
  images: string[] | null
  website: string | null
  opening_hours: any
  verification_level: number | null
  verification_method: string | null
  archived_at: string | null
  created_at: string
}

function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(aa))
}

function norm(s: string | null) {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function richness(p: Row) {
  let n = 0
  if (p.description && p.description.length > 30) n += 3
  if (p.main_image_url) n += 2
  if (Array.isArray(p.images) && p.images.length) n += 1
  if (p.website) n += 1
  if (p.opening_hours && Object.keys(p.opening_hours).length) n += 2
  if (p.verification_level && p.verification_level >= 3) n += 3
  if (p.vegan_level === 'fully_vegan') n += 4
  else if (p.vegan_level === 'mostly_vegan') n += 2
  return n
}

async function fetchAll(): Promise<Row[]> {
  const all: Row[] = []
  let last = '00000000-0000-0000-0000-000000000000'
  while (true) {
    const { data, error } = await supabase
      .from('places')
      .select(
        'id,slug,name,city,country,latitude,longitude,vegan_level,source,source_id,description,main_image_url,images,website,opening_hours,verification_level,verification_method,archived_at,created_at'
      )
      .is('archived_at', null)
      .gt('id', last)
      .order('id')
      .limit(1000)
    if (error) throw error
    if (!data?.length) break
    all.push(...(data as Row[]))
    last = data[data.length - 1].id
    if (data.length < 1000) break
    if (all.length % 5000 === 0) console.log(`  loaded ${all.length}...`)
  }
  return all
}

async function main() {
  console.log('Loading active places...')
  const rows = await fetchAll()
  console.log(`Loaded ${rows.length} places`)

  // Bucket by name+city+country
  const bucketKey = (r: Row) => `${norm(r.name)}|${norm(r.city)}|${norm(r.country)}`
  const buckets = new Map<string, Row[]>()
  for (const r of rows) {
    if (!norm(r.name)) continue
    const k = bucketKey(r)
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k)!.push(r)
  }

  const veganRank: Record<string, number> = {
    fully_vegan: 4,
    mostly_vegan: 3,
    vegan_friendly: 2,
    vegan_options: 1,
  }

  const confirmed: any[] = []
  const ambiguous: any[] = []
  const suffixRe = /-\d+$/
  let scannedBuckets = 0

  for (const [k, group] of buckets.entries()) {
    if (group.length < 2) continue
    scannedBuckets++

    // For each row in the group, find ANY other row within <=80m
    // and prefer to archive the suffixed / lower-richness one.
    const used = new Set<string>()
    for (let i = 0; i < group.length; i++) {
      const a = group[i]
      if (used.has(a.id)) continue
      for (let j = i + 1; j < group.length; j++) {
        const b = group[j]
        if (used.has(b.id)) continue
        let dist: number | null = null
        if (a.latitude != null && a.longitude != null && b.latitude != null && b.longitude != null) {
          dist = haversine(
            { lat: a.latitude, lon: a.longitude },
            { lat: b.latitude, lon: b.longitude }
          )
        }
        const aSuf = suffixRe.test(a.slug)
        const bSuf = suffixRe.test(b.slug)
        const sameLocation = dist !== null && dist <= 80
        const sameAddressNoCoords = dist === null

        if (!sameLocation && !sameAddressNoCoords) {
          // Different branches in the same city — keep both
          continue
        }

        // pick keeper / loser:
        //  1) higher vegan-level wins (so we never lose a fully/mostly vegan signal)
        //  2) higher richness wins
        //  3) unsuffixed slug wins
        //  4) older row wins
        const aR = richness(a)
        const bR = richness(b)
        const aV = veganRank[a.vegan_level ?? ''] ?? 0
        const bV = veganRank[b.vegan_level ?? ''] ?? 0
        let keeper: Row, loser: Row
        if (aV !== bV) {
          keeper = aV > bV ? a : b
          loser = aV > bV ? b : a
        } else if (aR !== bR) {
          keeper = aR > bR ? a : b
          loser = aR > bR ? b : a
        } else if (aSuf !== bSuf) {
          keeper = aSuf ? b : a
          loser = aSuf ? a : b
        } else {
          keeper = a.created_at < b.created_at ? a : b
          loser = a.created_at < b.created_at ? b : a
        }

        const loserVR = veganRank[loser.vegan_level ?? ''] ?? 0
        const keeperVR = veganRank[keeper.vegan_level ?? ''] ?? 0
        // Never archive a higher-vegan-tier row in favour of a lower one
        const safeArchiveOnVegan = loserVR <= keeperVR

        const summary = {
          name: a.name,
          city: a.city,
          country: a.country,
          distance_m: dist,
          keeper: {
            id: keeper.id,
            slug: keeper.slug,
            vegan_level: keeper.vegan_level,
            richness: richness(keeper),
            verification_level: keeper.verification_level,
            source: keeper.source,
          },
          loser: {
            id: loser.id,
            slug: loser.slug,
            vegan_level: loser.vegan_level,
            richness: richness(loser),
            verification_level: loser.verification_level,
            source: loser.source,
          },
          safeArchiveOnVegan,
        }

        if (sameLocation && safeArchiveOnVegan) {
          confirmed.push(summary)
          used.add(loser.id)
        } else {
          ambiguous.push({ ...summary, sameLocation, sameAddressNoCoords })
        }
      }
    }
  }
  const scanned = scannedBuckets

  const out = path.join(process.cwd(), 'scripts', 'seo-out')
  fs.mkdirSync(out, { recursive: true })
  fs.writeFileSync(
    path.join(out, 'duplicates.json'),
    JSON.stringify({ scanned, confirmed_count: confirmed.length, ambiguous_count: ambiguous.length, confirmed, ambiguous }, null, 2)
  )
  console.log(`Scanned suffixed slugs: ${scanned}`)
  console.log(`Confirmed dupes: ${confirmed.length}`)
  console.log(`Ambiguous (kept for now): ${ambiguous.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
