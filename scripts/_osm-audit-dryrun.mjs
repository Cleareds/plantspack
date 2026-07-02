// DRY-RUN OSM refresh audit — NO DATABASE WRITES.
// Per country: our current DB coverage vs what OSM offers under (a) our CURRENT
// sync tags and (b) an EXPANDED veggiekarte-style vegan set, plus new-candidate
// and possibly-closed/retagged counts. Writes a JSON + markdown table to
// performance/. Read-only (Overpass + Supabase read). Designed to run in CI
// (GitHub Actions) where Overpass is reachable and the process never sleeps.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// overpass-api.de is the reliable host; the community mirrors hard-429 under
// load, so keep them only as a last-resort fallback.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]
const OUT_JSON = 'performance/osm-refresh-audit-2026-07-02.json'
const OUT_MD = 'performance/osm-refresh-audit-2026-07-02.md'
const PAUSE_MS = 15000
const TIMEOUT_S = 120
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Names MUST match our DB `country` values so per-country counts line up.
const COUNTRIES = [
  { iso: 'DE', name: 'Germany' }, { iso: 'AT', name: 'Austria' }, { iso: 'CH', name: 'Switzerland' },
  { iso: 'NL', name: 'Netherlands' }, { iso: 'BE', name: 'Belgium' }, { iso: 'PT', name: 'Portugal' },
  { iso: 'ES', name: 'Spain' }, { iso: 'IT', name: 'Italy' }, { iso: 'PL', name: 'Poland' },
  { iso: 'GB', name: 'United Kingdom' }, { iso: 'FR', name: 'France' }, { iso: 'MX', name: 'Mexico' },
  { iso: 'BR', name: 'Brazil' }, { iso: 'JP', name: 'Japan' }, { iso: 'IN', name: 'India' },
  { iso: 'KR', name: 'South Korea' },
]

// Split into lighter per-family queries (a single combined query 504s on big
// countries). Current sync tags (diet:vegan yes|only) are derived from the vegan
// family client-side, so no separate query is needed for it.
const FAMILIES = {
  vegan: ['node["diet:vegan"~"yes|only|limited"]', 'way["diet:vegan"~"yes|only|limited"]'],
  cuisine: ['node["cuisine"~"vegan"]', 'way["cuisine"~"vegan"]'],
  vegOnly: ['node["diet:vegetarian"="only"]', 'way["diet:vegetarian"="only"]'],
}
const buildQuery = (iso, filters) =>
  `[out:json][timeout:${TIMEOUT_S}];area["ISO3166-1"="${iso}"][admin_level=2]->.a;(${filters.map((f) => `${f}(area.a);`).join('')});out center tags;`

async function overpass(query, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const ep = ENDPOINTS[i % ENDPOINTS.length]
    try {
      const ctl = new AbortController()
      const t = setTimeout(() => ctl.abort(), (TIMEOUT_S + 40) * 1000)
      const res = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal })
      clearTimeout(t)
      if (res.status === 429 || res.status === 504) { console.log(`    ${res.status} from ${ep}, backoff`); await sleep(20000 * (i + 1)); continue }
      if (!res.ok) { await sleep(10000); continue }
      const d = await res.json()
      return d.elements || []
    } catch (e) { console.log(`    fetch failed on ${ep}: ${e?.name || e}`); await sleep(12000 * (i + 1)) }
  }
  return null
}

function bucket(tags) {
  const dv = tags['diet:vegan'], cu = tags.cuisine || '', dvg = tags['diet:vegetarian']
  if (dv === 'only') return 'vegan_only'
  if (dv === 'yes') return 'vegan_yes'
  if (dv === 'limited') return 'vegan_limited'
  if (/vegan/.test(cu)) return 'cuisine_vegan'
  if (dvg === 'only') return 'vegetarian_only'
  return 'other'
}

function renderMd(results) {
  const h = `# OSM refresh audit (dry run) - 2026-07-02

No database writes. Per country: our current DB count vs OSM availability under our CURRENT
sync tags (\`diet:vegan~yes|only\`) vs an EXPANDED veggiekarte-style set
(\`diet:vegan~yes|only|limited\` + \`cuisine=vegan\` + \`diet:vegetarian=only\`). "New" = OSM
element id not already in our DB (real net-new is a bit lower after proximity dedup). "Review"
buckets (vegan_only + vegetarian_only) must NOT be auto-imported as fully_vegan. "Gone" =
our OSM-sourced place whose id is absent from the current OSM pull (closed OR retagged - review).

| Country | Our DB | OSM (current tags) | OSM (expanded) | Extra from expansion | New candidates | New: vegan_only (review) | New: vegetarian_only (review) | New: safe (vegan_yes/limited/cuisine) | Gone (review) |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
`
  const rows = results.map((r) => {
    const safe = r.newByBucket ? ((r.newByBucket.vegan_yes || 0) + (r.newByBucket.vegan_limited || 0) + (r.newByBucket.cuisine_vegan || 0)) : null
    const c = (v) => (v == null ? 'timeout' : v)
    return `| ${r.country} | ${r.ourCount} | ${c(r.osmCurrent)} | ${c(r.osmExpanded)} | ${c(r.extraFromExpanded)} | ${c(r.newCandidates)} | ${c(r.newVeganOnlyReview)} | ${c(r.newVegetarianOnlyReview)} | ${c(safe)} | ${c(r.gone)} |`
  }).join('\n')
  return h + rows + '\n'
}

function loadEnv() {
  try {
    const e = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
    return { url: e.NEXT_PUBLIC_SUPABASE_URL, key: e.SUPABASE_SERVICE_ROLE_KEY || e.SERVICE_ROLE_KEY }
  } catch {
    return { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY }
  }
}

async function main() {
  const { url, key } = loadEnv()
  const db = createClient(url, key)
  fs.mkdirSync('performance', { recursive: true })

  console.log('loading our places...')
  let rows = [], from = 0
  for (;;) { const { data } = await db.from('places').select('source_id,country').range(from, from + 999); if (!data?.length) break; rows.push(...data); if (data.length < 1000) break; from += 1000 }
  const ourCountByCountry = {}
  const ourOsmIdsByCountry = {}
  for (const r of rows) {
    const c = r.country || '?'
    ourCountByCountry[c] = (ourCountByCountry[c] || 0) + 1
    const s = String(r.source_id || '')
    if (/osm/i.test(s)) { const m = s.match(/(\d+)\s*$/); if (m) { (ourOsmIdsByCountry[c] ||= new Set()).add(m[1]) } }
  }
  console.log(`loaded ${rows.length} places`)

  const results = []
  const save = () => { fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2)); fs.writeFileSync(OUT_MD, renderMd(results)) }

  for (const co of COUNTRIES) {
    console.log(`\n=== ${co.name} (${co.iso}) ===`)
    const byId = new Map()
    let failed = false
    for (const [fam, filters] of Object.entries(FAMILIES)) {
      const els = await overpass(buildQuery(co.iso, filters))
      await sleep(PAUSE_MS)
      if (els === null) { console.log(`  family ${fam} failed`); failed = true; break }
      for (const e of els) if (e.tags?.name) byId.set(`${e.type}/${e.id}`, e)
      console.log(`  ${fam}: ${els.length}`)
    }
    const rec = { country: co.name, iso: co.iso, ourCount: ourCountByCountry[co.name] || 0 }
    if (failed) { rec.osmCurrent = null; rec.osmExpanded = null; results.push(rec); save(); continue }

    const named = [...byId.values()]
    rec.osmExpanded = named.length
    rec.osmCurrent = named.filter((e) => ['yes', 'only'].includes(e.tags['diet:vegan'])).length
    rec.extraFromExpanded = Math.max(0, rec.osmExpanded - rec.osmCurrent)
    const ourIds = ourOsmIdsByCountry[co.name] || new Set()
    const present = new Set(named.map((e) => String(e.id)))
    let newC = 0; const nb = {}
    for (const e of named) { if (!ourIds.has(String(e.id))) { newC++; const b = bucket(e.tags); nb[b] = (nb[b] || 0) + 1 } }
    rec.newCandidates = newC; rec.newByBucket = nb
    rec.newVeganOnlyReview = nb.vegan_only || 0
    rec.newVegetarianOnlyReview = nb.vegetarian_only || 0
    let gone = 0; for (const id of ourIds) if (!present.has(id)) gone++
    rec.gone = gone
    console.log(`  our=${rec.ourCount} cur=${rec.osmCurrent} exp=${rec.osmExpanded} new=${newC} veganOnly=${rec.newVeganOnlyReview} vegOnly=${rec.newVegetarianOnlyReview} gone=${gone}`)
    results.push(rec); save()
  }

  save()
  console.log(`\nDONE. Report: ${OUT_MD}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
