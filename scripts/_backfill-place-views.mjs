#!/usr/bin/env node
/**
 * Backfill per-place Google Search performance from the Search Console API.
 *
 * Run:  node scripts/_backfill-place-views.mjs            # dry run, reports coverage
 *       node scripts/_backfill-place-views.mjs --apply    # writes place_search_stats
 *       node scripts/_backfill-place-views.mjs --months 3 # shorter window
 *
 * Auth: same impersonation chain as scripts/seo-monitor.ts - mints a short-lived
 * plantspack-seo-bot token from whichever gcloud user credential is alive. If both
 * are dead the fix is `gcloud auth application-default login`.
 *
 * Why month-by-month instead of one 16-month query: the GSC API caps a single
 * response at 25,000 rows and the total addressable rows per query are limited
 * too. With ~52k place pages a single aggregated window would silently truncate
 * and we would under-report the long tail. Chunking by month and summing is more
 * API calls but complete, and it leaves the door open to a time series later.
 *
 * Clicks and impressions sum cleanly across months. ctr and position do not:
 * ctr is recomputed from the summed totals, and position is an impressions-
 * weighted mean so a 1-impression month cannot move it as much as a 10,000-one.
 */
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const SA = 'plantspack-seo-bot@plantspack.iam.gserviceaccount.com'
const GSC_SITE = encodeURIComponent('sc-domain:plantspack.com')
const APPLY = process.argv.includes('--apply')
const MONTHS = (() => {
  const i = process.argv.indexOf('--months')
  const n = i >= 0 ? parseInt(process.argv[i + 1], 10) : 16
  // GSC retention is 16 months; asking for more just returns empty months.
  return Math.max(1, Math.min(16, Number.isFinite(n) ? n : 16))
})()
// GSC data lags ~2-3 days. Ending the window at today-3 avoids a partial tail
// that would make a re-run look like a regression.
const LAG_DAYS = 3
const PAGE_SIZE = 25000

function env(key) {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
  const m = raw.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return m ? m[1].trim() : undefined
}

function gcloudToken() {
  for (const cmd of ['gcloud auth application-default print-access-token', 'gcloud auth print-access-token']) {
    try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { /* try next */ }
  }
  return null
}

async function mintSaToken() {
  const userToken = gcloudToken()
  if (!userToken) return null
  const res = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SA}:generateAccessToken`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/webmasters.readonly'] }),
    },
  )
  if (!res.ok) {
    console.error(`[backfill] token mint failed ${res.status}: ${(await res.text()).slice(0, 300)}`)
    return null
  }
  return (await res.json()).accessToken || null
}

async function gscQuery(token, body) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${GSC_SITE}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    if (res.ok) return (await res.json()).rows || []
    // 429/5xx are transient at this request volume; back off rather than losing
    // the whole run partway through month 11.
    if (res.status === 429 || res.status >= 500) {
      const wait = 2000 * 2 ** attempt
      console.error(`[backfill] GSC ${res.status}, retrying in ${wait}ms`)
      await new Promise(r => setTimeout(r, wait))
      continue
    }
    throw new Error(`GSC ${res.status}: ${(await res.text()).slice(0, 300)}`)
  }
  throw new Error('GSC: retries exhausted')
}

/** All rows for one window, paginating past the 25k-per-response cap. */
async function gscPagedPages(token, startDate, endDate) {
  const out = []
  for (let startRow = 0; ; startRow += PAGE_SIZE) {
    const rows = await gscQuery(token, {
      startDate, endDate,
      dimensions: ['page'],
      rowLimit: PAGE_SIZE,
      startRow,
      dataState: 'final',
    })
    out.push(...rows)
    if (rows.length < PAGE_SIZE) break
    if (startRow > 400000) { console.error('[backfill] safety cap hit, stopping pagination'); break }
  }
  return out
}

const iso = d => d.toISOString().slice(0, 10)

/** Inclusive month windows, oldest first, ending at today-LAG_DAYS. */
function monthWindows(months) {
  const end = new Date(); end.setDate(end.getDate() - LAG_DAYS)
  const out = []
  for (let i = months - 1; i >= 0; i--) {
    const s = new Date(end.getFullYear(), end.getMonth() - i, 1)
    const e = new Date(end.getFullYear(), end.getMonth() - i + 1, 0)
    out.push({ startDate: iso(s), endDate: iso(e > end ? end : e) })
  }
  return out
}

/**
 * Pull the place slug (or uuid) out of a GSC page URL.
 *
 * Links are built as `/place/${place.slug || place.id}`, so both forms are in the
 * index. GSC percent-encodes non-ASCII paths, which this codebase has been bitten
 * by before, so decode before matching.
 */
function placeKeyFromUrl(url) {
  let path
  try { path = new URL(url).pathname } catch { return null }
  try { path = decodeURIComponent(path) } catch { /* leave as-is if malformed */ }
  const m = path.match(/^\/place\/([^/?#]+)\/?$/)
  return m ? m[1] : null
}

async function main() {
  console.log(`[backfill] window: ${MONTHS} month(s), mode: ${APPLY ? 'APPLY' : 'dry run'}`)

  const token = await mintSaToken()
  if (!token) {
    console.error('\n[backfill] no live gcloud credential - both ADC and the CLI token are expired.')
    console.error('           Fix:  gcloud auth application-default login\n')
    process.exit(1)
  }

  const windows = monthWindows(MONTHS)
  console.log(`[backfill] fetching ${windows[0].startDate} -> ${windows[windows.length - 1].endDate}`)

  // key -> { clicks, impressions, posWeighted }
  const byKey = new Map()
  let totalRows = 0, placeRows = 0
  // The requested window reaches back 16 months, but the site is younger than
  // that: everything before 2026-01 returns nothing. Recording the requested
  // start would make the UI claim "Mar 2025 - Jul 2026" and overstate how long
  // we have been measuring, so track the first month that actually had data.
  let firstDataMonth = null
  for (const w of windows) {
    const rows = await gscPagedPages(token, w.startDate, w.endDate)
    totalRows += rows.length
    if (rows.length && !firstDataMonth) firstDataMonth = w.startDate
    for (const r of rows) {
      const key = placeKeyFromUrl(r.keys[0])
      if (!key) continue
      placeRows++
      const cur = byKey.get(key) || { clicks: 0, impressions: 0, posWeighted: 0 }
      cur.clicks += r.clicks || 0
      cur.impressions += r.impressions || 0
      cur.posWeighted += (r.position || 0) * (r.impressions || 0)
      byKey.set(key, cur)
    }
    console.log(`  ${w.startDate}..${w.endDate}  rows=${rows.length}  place-rows so far=${placeRows}`)
  }

  console.log(`\n[backfill] GSC returned ${totalRows} page rows total; ${placeRows} were /place/ rows`)
  console.log(`[backfill] distinct place URLs with >=1 impression: ${byKey.size}`)

  // ---- Map keys (slug or uuid) to place ids ----------------------------------
  const sb = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const keys = [...byKey.keys()]
  const isUuid = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  const slugKeys = keys.filter(k => !isUuid(k))
  const uuidKeys = keys.filter(isUuid)

  const resolved = new Map() // key -> place id
  const CHUNK = 500
  for (const [col, list] of [['slug', slugKeys], ['id', uuidKeys]]) {
    for (let i = 0; i < list.length; i += CHUNK) {
      const batch = list.slice(i, i + CHUNK)
      const { data, error } = await sb.from('places').select(`id, ${col}`).in(col, batch)
      if (error) throw new Error(`places lookup (${col}): ${error.message}`)
      for (const row of data) resolved.set(String(row[col]), row.id)
    }
  }

  const unmatched = keys.filter(k => !resolved.has(k))

  // A place can be reachable by both slug and uuid; fold them onto the place id
  // so we write one row per place rather than double-counting.
  const byPlace = new Map()
  for (const [key, v] of byKey) {
    const id = resolved.get(key)
    if (!id) continue
    const cur = byPlace.get(id) || { clicks: 0, impressions: 0, posWeighted: 0 }
    cur.clicks += v.clicks
    cur.impressions += v.impressions
    cur.posWeighted += v.posWeighted
    byPlace.set(id, cur)
  }

  // ---- Coverage report ------------------------------------------------------
  const { count: livePlaces } = await sb.from('places')
    .select('*', { count: 'exact', head: true }).is('archived_at', null)

  const vals = [...byPlace.values()]
  const withClicks = vals.filter(v => v.clicks > 0).length
  const sum = (f) => vals.reduce((a, v) => a + f(v), 0)
  const pct = (n, d) => d ? `${(100 * n / d).toFixed(1)}%` : 'n/a'

  console.log('\n================ COVERAGE ================')
  console.log(`Live places:                        ${livePlaces?.toLocaleString()}`)
  console.log(`Matched to a place:                 ${byPlace.size.toLocaleString()}  (${pct(byPlace.size, livePlaces)} of live)`)
  console.log(`  ...of those, >=1 Google click:    ${withClicks.toLocaleString()}  (${pct(withClicks, byPlace.size)} of matched)`)
  console.log(`Unmatched URLs (renamed/archived):  ${unmatched.length.toLocaleString()}`)
  console.log(`Total impressions:                  ${sum(v => v.impressions).toLocaleString()}`)
  console.log(`Total clicks:                       ${sum(v => v.clicks).toLocaleString()}`)
  if (unmatched.length) console.log(`\nSample unmatched: ${unmatched.slice(0, 8).join(', ')}`)

  // Distribution matters more than the total here: it decides whether a
  // "your place was seen N times" line is worth showing at all, or whether most
  // contributors would see a demoralising zero.
  const buckets = { '0': 0, '1-9': 0, '10-99': 0, '100-999': 0, '1k-9.9k': 0, '10k+': 0 }
  for (const v of vals) {
    const n = v.impressions
    if (n === 0) buckets['0']++
    else if (n < 10) buckets['1-9']++
    else if (n < 100) buckets['10-99']++
    else if (n < 1000) buckets['100-999']++
    else if (n < 10000) buckets['1k-9.9k']++
    else buckets['10k+']++
  }
  console.log('\nImpressions distribution (matched places):')
  for (const [k, n] of Object.entries(buckets)) console.log(`  ${k.padEnd(9)} ${n.toLocaleString()}`)
  console.log('==========================================\n')

  if (!APPLY) {
    console.log('[backfill] dry run - nothing written. Re-run with --apply to persist.')
    return
  }

  // ---- Write ---------------------------------------------------------------
  // Honest window: when data actually starts, not when we started asking.
  const period_start = firstDataMonth || windows[0].startDate
  const period_end = windows[windows.length - 1].endDate
  const rows = [...byPlace.entries()].map(([place_id, v]) => ({
    place_id,
    clicks: Math.round(v.clicks),
    impressions: Math.round(v.impressions),
    ctr: v.impressions ? +(v.clicks / v.impressions).toFixed(6) : null,
    avg_position: v.impressions ? +(v.posWeighted / v.impressions).toFixed(2) : null,
    period_start, period_end,
    source: 'gsc',
    fetched_at: new Date().toISOString(),
  }))

  let written = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK)
    // 55 batches over one connection is enough for a transient `fetch failed` to
    // show up (it did, at batch 33). The upsert is idempotent on place_id, so
    // retrying a batch is always safe.
    let lastErr
    for (let attempt = 0; attempt < 4; attempt++) {
      const { error } = await sb.from('place_search_stats').upsert(batch, { onConflict: 'place_id' })
      if (!error) { lastErr = null; break }
      lastErr = error
      await new Promise(r => setTimeout(r, 1500 * 2 ** attempt))
    }
    if (lastErr) throw new Error(`upsert at ${i} after retries: ${lastErr.message}`)
    written += batch.length
    if (written % 5000 < CHUNK) console.log(`  written ${written}/${rows.length}`)
  }
  console.log(`[backfill] wrote ${written} rows to place_search_stats (${period_start} -> ${period_end})`)
}

main().catch(e => { console.error('[backfill] FAILED:', e.message); process.exit(1) })
