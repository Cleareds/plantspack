/**
 * Backfill missing fields on OSM-imported places by re-querying the
 * Overpass API for fresh tags. Only writes fields that are currently
 * empty on the place row — never overwrites human-edited data.
 *
 * Targets: places with osm_ref set, missing AT LEAST ONE of:
 *   website, phone, opening_hours (raw), description.
 *
 * Stays inside the free public Overpass endpoint and rate-limits itself
 * (40 nodes per call, 1 call/sec). Caps at OSM_BACKFILL_LIMIT places.
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

const LIMIT = parseInt(process.env.OSM_BACKFILL_LIMIT || '500', 10)
const BATCH = 40
const OVERPASS = 'https://overpass-api.de/api/interpreter'

type Row = {
  id: string
  slug: string
  name: string
  source: string | null
  source_id: string | null
  website: string | null
  phone: string | null
  opening_hours: any
  description: string | null
  vegan_level: string | null
}

function parseOsmRef(ref: string | null): { type: 'node' | 'way' | 'relation'; id: string } | null {
  if (!ref) return null
  // Real-world formats observed: 'osm-node-1234', 'osm-way-1234', 'osm-relation-1234'.
  // Fall back to the older 'node/1234' / '1234' shapes for legacy rows.
  const m1 = /^osm-(node|way|relation)-(\d+)$/.exec(ref.trim())
  if (m1) return { type: m1[1] as any, id: m1[2] }
  const m2 = /^(node|way|relation)[\/:](\d+)$/.exec(ref.trim())
  if (m2) return { type: m2[1] as any, id: m2[2] }
  if (/^\d+$/.test(ref.trim())) return { type: 'node', id: ref.trim() }
  return null
}

function parseHoursToObject(s: string | null | undefined): Record<string, string> | null {
  // Convert OSM opening_hours to our { Mon: "10:00-18:00" } format if simple.
  // Keeps things conservative — only writes when we can parse cleanly.
  if (!s) return null
  const t = s.trim()
  if (!t || t === '24/7') return t === '24/7' ? { Mon: '00:00-24:00', Tue: '00:00-24:00', Wed: '00:00-24:00', Thu: '00:00-24:00', Fri: '00:00-24:00', Sat: '00:00-24:00', Sun: '00:00-24:00' } : null
  const dayMap: Record<string, string> = { Mo: 'Mon', Tu: 'Tue', We: 'Wed', Th: 'Thu', Fr: 'Fri', Sa: 'Sat', Su: 'Sun' }
  const out: Record<string, string> = {}
  // Split by ';' for chunks like "Mo-Fr 09:00-18:00; Sa 10:00-14:00"
  for (const chunk of t.split(';').map((c) => c.trim()).filter(Boolean)) {
    const m = /^([A-Za-z,\-]+)\s+(\d{1,2}:\d{2}-\d{1,2}:\d{2}(?:,\d{1,2}:\d{2}-\d{1,2}:\d{2})*)/.exec(chunk)
    if (!m) return null // give up if anything is exotic
    const dayPart = m[1]
    const hoursPart = m[2]
    const days: string[] = []
    for (const seg of dayPart.split(',').map((s) => s.trim())) {
      const range = /^([A-Za-z]{2})-([A-Za-z]{2})$/.exec(seg)
      if (range) {
        const order = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
        const a = order.indexOf(range[1])
        const b = order.indexOf(range[2])
        if (a < 0 || b < 0) return null
        for (let i = a; i <= b; i++) days.push(order[i])
      } else if (/^[A-Za-z]{2}$/.test(seg)) {
        days.push(seg)
      } else {
        return null
      }
    }
    for (const d of days) {
      const human = dayMap[d]
      if (!human) return null
      out[human] = hoursPart
    }
  }
  return Object.keys(out).length ? out : null
}

async function fetchTargets(): Promise<Row[]> {
  const all: Row[] = []
  let last = '00000000-0000-0000-0000-000000000000'
  while (all.length < LIMIT) {
    const { data, error } = await supabase
      .from('places')
      .select('id, slug, name, source, source_id, website, phone, opening_hours, description, vegan_level')
      .is('archived_at', null)
      .like('source', 'osm%')
      .not('source_id', 'is', null)
      .gt('id', last)
      .order('id')
      .limit(1000)
    if (error) throw error
    if (!data?.length) break
    for (const r of data as Row[]) {
      const missing =
        !r.website ||
        !r.phone ||
        !r.opening_hours ||
        (typeof r.opening_hours === 'object' && Object.keys(r.opening_hours).length === 0) ||
        !(r.description && r.description.trim().length >= 50)
      if (missing) all.push(r)
      if (all.length >= LIMIT) break
    }
    last = data[data.length - 1].id
    if (data.length < 1000) break
  }
  return all
}

async function overpassFetch(refs: { type: string; id: string }[]) {
  const groups: Record<string, string[]> = { node: [], way: [], relation: [] }
  for (const r of refs) groups[r.type].push(r.id)
  const parts: string[] = []
  if (groups.node.length) parts.push(`node(id:${groups.node.join(',')});`)
  if (groups.way.length) parts.push(`way(id:${groups.way.join(',')});`)
  if (groups.relation.length) parts.push(`relation(id:${groups.relation.join(',')});`)
  const q = `[out:json][timeout:25];(${parts.join('')});out tags;`
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'PlantsPack/1.0 (vegan directory; hello@plantspack.com)',
      'Accept': 'application/json',
    },
    body: 'data=' + encodeURIComponent(q),
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
  const j = await res.json()
  return (j.elements || []) as Array<{ type: string; id: number; tags?: Record<string, string> }>
}

async function main() {
  console.log(`Loading up to ${LIMIT} OSM places missing data...`)
  const targets = await fetchTargets()
  console.log(`Found ${targets.length} candidates`)

  let updated = 0
  let untouched = 0
  let websiteAdded = 0
  let phoneAdded = 0
  let hoursAdded = 0
  let descAdded = 0

  // Process in batches of BATCH to keep Overpass queries small.
  for (let i = 0; i < targets.length; i += BATCH) {
    const slice = targets.slice(i, i + BATCH)
    const refs: { type: any; id: string; row: Row }[] = []
    for (const r of slice) {
      const parsed = parseOsmRef(r.source_id)
      if (parsed) refs.push({ ...parsed, row: r })
    }
    if (!refs.length) continue

    let elements: Awaited<ReturnType<typeof overpassFetch>> = []
    try {
      elements = await overpassFetch(refs.map((x) => ({ type: x.type, id: x.id })))
    } catch (e: any) {
      console.warn(`Overpass batch ${i}-${i + slice.length} failed: ${e.message}; sleeping 5s and continuing`)
      await new Promise((r) => setTimeout(r, 5000))
      continue
    }

    const byKey = new Map<string, Record<string, string>>()
    for (const el of elements) {
      byKey.set(`${el.type}/${el.id}`, el.tags || {})
    }
    if (process.env.DEBUG === '1') {
      console.log(`  overpass returned ${elements.length} elements; ${refs.length} refs requested`)
      if (refs[0]) {
        const k = `${refs[0].type}/${refs[0].id}`
        console.log(`  sample ref ${k}:`, byKey.get(k))
      }
    }

    for (const ref of refs) {
      const tags = byKey.get(`${ref.type}/${ref.id}`)
      if (!tags) {
        untouched++
        continue
      }
      const r = ref.row
      const patch: Record<string, any> = {}

      if (!r.website) {
        const w = tags['website'] || tags['contact:website'] || tags['url']
        if (w && /^https?:\/\//i.test(w)) {
          patch.website = w
          websiteAdded++
        } else if (w && /^[\w.-]+\.[a-z]{2,}/i.test(w)) {
          patch.website = `https://${w}`
          websiteAdded++
        }
      }
      if (!r.phone) {
        const p = tags['phone'] || tags['contact:phone']
        if (p && p.length > 4) {
          patch.phone = p
          phoneAdded++
        }
      }
      const hoursEmpty =
        !r.opening_hours ||
        (typeof r.opening_hours === 'object' && Object.keys(r.opening_hours).length === 0)
      if (hoursEmpty && tags['opening_hours']) {
        const parsed = parseHoursToObject(tags['opening_hours'])
        if (parsed) {
          patch.opening_hours = parsed
          hoursAdded++
        }
      }
      const descShort = !(r.description && r.description.trim().length >= 50)
      if (descShort) {
        const d = tags['description'] || tags['description:en']
        if (d && d.length >= 30) {
          patch.description = d.slice(0, 600)
          descAdded++
        }
      }

      if (Object.keys(patch).length === 0) {
        untouched++
        continue
      }
      patch.updated_at = new Date().toISOString()
      const { error } = await supabase.from('places').update(patch).eq('id', r.id)
      if (error) {
        console.warn(`update failed for ${r.slug}: ${error.message}`)
        continue
      }
      updated++
    }

    console.log(
      `  batch ${i / BATCH + 1}: updated=${updated} (web=${websiteAdded} phone=${phoneAdded} hours=${hoursAdded} desc=${descAdded}) untouched=${untouched}`
    )
    // polite pause for Overpass
    await new Promise((r) => setTimeout(r, 1100))
  }

  const out = path.join(process.cwd(), 'scripts', 'seo-out')
  fs.mkdirSync(out, { recursive: true })
  fs.writeFileSync(
    path.join(out, 'osm-backfill.json'),
    JSON.stringify(
      {
        ran_at: new Date().toISOString(),
        candidates: targets.length,
        updated,
        untouched,
        websiteAdded,
        phoneAdded,
        hoursAdded,
        descAdded,
      },
      null,
      2
    )
  )
  console.log('')
  console.log(`Done. Updated ${updated}/${targets.length} places.`)
  console.log(`  websites: +${websiteAdded}`)
  console.log(`  phones:   +${phoneAdded}`)
  console.log(`  hours:    +${hoursAdded}`)
  console.log(`  descs:    +${descAdded}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
