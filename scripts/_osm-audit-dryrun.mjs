// DRY-RUN OSM refresh audit — NO DATABASE WRITES.
// Per country: our current DB coverage vs what OSM offers under (a) our CURRENT
// sync tags and (b) an EXPANDED veggiekarte-style vegan set, plus new-candidate
// and possibly-closed/retagged counts. Writes a JSON + markdown table to
// performance/. Read-only (Overpass + Supabase read). Designed to run in CI
// (GitHub Actions) where Overpass is reachable and the process never sleeps.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// overpass-api.de works from a residential IP; community mirrors + cloud IPs
// (GitHub runners) get 429'd. Run this locally.
const ENDPOINTS = ['https://overpass-api.de/api/interpreter']
const OUT_JSON = 'performance/osm-refresh-audit-2026-07-02.json'
const OUT_MD = 'performance/osm-refresh-audit-2026-07-02.md'
const PAUSE_MS = 8000
const TIMEOUT_S = 150
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

// WAF-safe filter set: overpass-api.de's mod_security returns 406 for the
// 3-alternation regex ~"yes|only|limited", so use ~"yes|only" + exact ="limited".
// One combined query per country (fewer requests = less rate-limit risk).
const FILTERS = [
  'node["diet:vegan"~"yes|only"]', 'way["diet:vegan"~"yes|only"]',
  'node["diet:vegan"="limited"]', 'way["diet:vegan"="limited"]',
  'node["cuisine"~"vegan"]', 'way["cuisine"~"vegan"]',
  'node["diet:vegetarian"="only"]', 'way["diet:vegetarian"="only"]',
]
const buildQuery = (iso, filters) =>
  `[out:json][timeout:${TIMEOUT_S}];area["ISO3166-1"="${iso}"][admin_level=2]->.a;(${filters.map((f) => `${f}(area.a);`).join('')});out center tags;`

async function overpass(query, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const ep = ENDPOINTS[i % ENDPOINTS.length]
    try {
      const ctl = new AbortController()
      const t = setTimeout(() => ctl.abort(), (TIMEOUT_S + 40) * 1000)
      // overpass-api.de's WAF returns 406 to requests with Node's default
      // User-Agent — a descriptive UA (Overpass etiquette) is REQUIRED.
      const res = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Plants Pack-OSM-audit/1.0 (anton.kravchuk@vaimo.com)' }, signal: ctl.signal })
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

  // Resumable: keep any country already completed in a prior run so a kill
  // (laptop sleep) doesn't force starting over; only re-query the unfinished ones.
  let prior = []
  try { prior = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')) } catch {}
  const priorDone = new Map(prior.filter((r) => r.osmExpanded != null).map((r) => [r.country, r]))
  const results = []
  const save = () => { fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2)); fs.writeFileSync(OUT_MD, renderMd(results)) }

  for (const co of COUNTRIES) {
    if (priorDone.has(co.name)) { console.log(`skip ${co.name} (already done)`); results.push(priorDone.get(co.name)); save(); continue }
    console.log(`\n=== ${co.name} (${co.iso}) ===`)
    const els = await overpass(buildQuery(co.iso, FILTERS))
    await sleep(PAUSE_MS)
    const rec = { country: co.name, iso: co.iso, ourCount: ourCountByCountry[co.name] || 0 }
    if (els === null) { console.log('  query failed'); rec.osmCurrent = null; rec.osmExpanded = null; results.push(rec); save(); continue }
    const byId = new Map()
    for (const e of els) if (e.tags?.name) byId.set(`${e.type}/${e.id}`, e)
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
