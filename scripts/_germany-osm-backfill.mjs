// Backfill opening_hours, phone, website from OSM tags for Germany places
// that have source_id=osm-* but missing those fields.
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const all = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('id,slug,source_id,opening_hours,phone,website,cuisine_types').eq('country','Germany').is('archived_at',null).like('source_id','osm-%').range(from, from+999)
  if (!data?.length) break
  all.push(...data); if (data.length<1000) break; from+=1000
}

// Only those missing at least one fillable field
const targets = all.filter(r => !r.opening_hours || !r.phone || !r.website)
console.log(`Targets: ${targets.length}`)

// Group by type
const byType = { node: [], way: [], relation: [] }
const byId = new Map()
for (const r of targets) {
  const m = r.source_id.match(/^osm-(node|way|relation)-(\d+)$/)
  if (!m) continue
  byType[m[1]].push(m[2])
  byId.set(`${m[1]}-${m[2]}`, r)
}
console.log(`Nodes ${byType.node.length}, Ways ${byType.way.length}, Relations ${byType.relation.length}`)

function fetchOverpass(q) {
  return new Promise((resolve, reject) => {
    const child = spawn('curl', ['-fsS', '--max-time', '120', '-X', 'POST',
      '-A', 'plantspack-osm-audit/1.0', '--data-urlencode', `data=${q}`,
      'https://overpass-api.de/api/interpreter'], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = '', err = ''
    child.stdout.on('data', d => { out += d })
    child.stderr.on('data', d => { err += d })
    child.on('exit', code => code === 0 ? resolve(out) : reject(new Error(err)))
  })
}

const updates = new Map()
async function fetchBatch(type, ids) {
  if (!ids.length) return
  const idList = ids.join(',')
  const q = `[out:json][timeout:120];${type}(id:${idList});out tags;`
  let attempts = 0
  while (attempts < 3) {
    try {
      const j = JSON.parse(await fetchOverpass(q))
      for (const el of j.elements || []) {
        const key = `${el.type}-${el.id}`
        const t = el.tags || {}
        updates.set(key, {
          opening_hours: t.opening_hours,
          phone: t.phone || t['contact:phone'],
          website: t.website || t['contact:website'],
        })
      }
      return
    } catch (e) {
      attempts++
      if (attempts < 3) await new Promise(r=>setTimeout(r,5000))
    }
  }
  console.log(`  FAIL batch of ${ids.length} ${type}s`)
}

// Chunk into 100 IDs per query
const CHUNK = 100
for (const [type, ids] of Object.entries(byType)) {
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i+CHUNK)
    process.stdout.write(`  ${type} batch ${i}-${i+chunk.length}: `)
    await fetchBatch(type, chunk)
    console.log(`updates so far: ${updates.size}`)
    await new Promise(r=>setTimeout(r,2000))
  }
}

// Apply updates
let ok = 0
for (const [key, tags] of updates) {
  const r = byId.get(key)
  if (!r) continue
  const patch = {}
  if (!r.opening_hours && tags.opening_hours) patch.opening_hours = tags.opening_hours
  if (!r.phone && tags.phone) patch.phone = tags.phone
  if (!r.website && tags.website && /^https?:/.test(tags.website)) patch.website = tags.website
  if (Object.keys(patch).length === 0) continue
  const { error } = await sb.from('places').update(patch).eq('id', r.id)
  if (!error) ok++
  if (ok % 25 === 0) process.stdout.write(`[${ok}]`)
}
console.log(`\n✓ Backfilled ${ok} records`)
