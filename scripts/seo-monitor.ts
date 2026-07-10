#!/usr/bin/env tsx
/**
 * Weekly SEO monitor: pulls Search Console + GA4 via the plantspack-seo-bot
 * impersonation chain and emails a cohort report + index-churn alarm.
 *
 * Run:  npx tsx scripts/seo-monitor.ts [--dry-run]
 *   --dry-run prints the report to stdout and skips the email.
 *
 * Auth: mints a short-lived SA token via iamcredentials using whichever
 * gcloud user credential is alive (ADC first, CLI fallback). Requires
 * anton@cleareds to hold roles/iam.serviceAccountTokenCreator on the SA
 * (granted 2026-07-10). When the Workspace session has expired the script
 * emails a re-auth warning (at most once per 7 days, tracked in
 * .seo-monitor-state.json) and exits 1 so the wrapper retries tomorrow.
 *
 * GSC data lags ~2-3 days, so all windows end at today-3.
 */
import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { sendEmail } from '@/lib/email'

const SA = 'plantspack-seo-bot@plantspack.iam.gserviceaccount.com'
const GSC_SITE = encodeURIComponent('sc-domain:plantspack.com')
const GA4_PROPERTY = '518355705'
const TO = 'anton.kravchuk@cleareds.com'
const STATE_FILE = new URL('../.seo-monitor-state.json', import.meta.url).pathname
const DRY = process.argv.includes('--dry-run')

interface State { lastSuccess?: string; lastAuthWarn?: string }
function loadState(): State {
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf-8')) } catch { return {} }
}
function saveState(s: State) { writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)) }

function gcloudToken(): string | null {
  for (const cmd of ['gcloud auth application-default print-access-token', 'gcloud auth print-access-token']) {
    try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { /* next */ }
  }
  return null
}

async function mintSaToken(): Promise<string | null> {
  const userToken = gcloudToken()
  if (!userToken) return null
  const res = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SA}:generateAccessToken`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/analytics.readonly'] }),
  })
  if (!res.ok) return null
  return (await res.json()).accessToken || null
}

function iso(d: Date): string { return d.toISOString().slice(0, 10) }
function daysAgo(n: number): Date { const d = new Date(); d.setDate(d.getDate() - n); return d }

async function gscQuery(token: string, body: any): Promise<any[]> {
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${GSC_SITE}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`GSC ${res.status}: ${await res.text()}`)
  return (await res.json()).rows || []
}

function cohortOf(url: string): string {
  const path = url.replace(/https?:\/\/[^/]+/, '')
  if (path.includes('/best-vegan')) return 'dish pages'
  if (path.startsWith('/place/')) return 'place pages'
  if (path.startsWith('/vegan-places')) return 'city/country hubs'
  if (path.startsWith('/event')) return 'events'
  if (path.startsWith('/recipe')) return 'recipes'
  if (path.startsWith('/blog') || path.startsWith('/vegan/')) return 'articles'
  if (path.startsWith('/tools')) return 'tools'
  return 'other'
}

async function main() {
  const state = loadState()
  const token = await mintSaToken()
  if (!token) {
    console.error('[seo-monitor] could not mint SA token — gcloud session likely expired')
    const lastWarn = state.lastAuthWarn ? new Date(state.lastAuthWarn).getTime() : 0
    if (!DRY && Date.now() - lastWarn > 7 * 864e5) {
      await sendEmail({
        to: TO,
        subject: '[PlantsPack] SEO monitor blocked — gcloud re-auth needed',
        html: '<p>The weekly SEO monitor could not authenticate. Run <code>gcloud auth login</code> on the laptop (or extend the Google Cloud session length in the Workspace admin console) and it will resume on its own.</p>',
        text: 'SEO monitor blocked - run: gcloud auth login',
      })
      saveState({ ...state, lastAuthWarn: new Date().toISOString() })
    }
    process.exit(1)
  }

  const end = iso(daysAgo(3))
  const start12w = iso(daysAgo(3 + 12 * 7))
  const curStart = iso(daysAgo(3 + 13)) // last 14 complete days
  const prevStart = iso(daysAgo(3 + 27))
  const prevEnd = iso(daysAgo(3 + 14))

  // 1) Weekly totals, 12 weeks
  const daily = await gscQuery(token, { startDate: start12w, endDate: end, dimensions: ['date'] })
  const weeks = new Map<string, { clicks: number; impr: number; posW: number }>()
  for (const r of daily) {
    const d = new Date(r.keys[0])
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday of that week
    const k = iso(d)
    const w = weeks.get(k) || { clicks: 0, impr: 0, posW: 0 }
    w.clicks += r.clicks; w.impr += r.impressions; w.posW += r.position * r.impressions
    weeks.set(k, w)
  }

  // 2) Cohorts: current 14d vs previous 14d, page-level
  const [curPages, prevPages] = await Promise.all([
    gscQuery(token, { startDate: curStart, endDate: end, dimensions: ['page'], rowLimit: 25000 }),
    gscQuery(token, { startDate: prevStart, endDate: prevEnd, dimensions: ['page'], rowLimit: 25000 }),
  ])
  const agg = (rows: any[]) => {
    const m = new Map<string, { clicks: number; impr: number; posW: number; pages: number }>()
    for (const r of rows) {
      const c = cohortOf(r.keys[0])
      const a = m.get(c) || { clicks: 0, impr: 0, posW: 0, pages: 0 }
      a.clicks += r.clicks; a.impr += r.impressions; a.posW += r.position * r.impressions; a.pages++
      m.set(c, a)
    }
    return m
  }
  const curCo = agg(curPages)
  const prevCo = agg(prevPages)

  // 3) Churn alarm: pages with >=5 impressions in the previous window and 0 now
  const curSet = new Set(curPages.map(r => r.keys[0]))
  const lost = prevPages.filter(r => r.impressions >= 5 && !curSet.has(r.keys[0]))
  lost.sort((a, b) => b.impressions - a.impressions)

  // 4) GA4 organic vs total, weekly
  const gaRes = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: start12w, endDate: end }],
      dimensions: [{ name: 'yearWeek' }, { name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'yearWeek' } }],
    }),
  })
  const ga = gaRes.ok ? (await gaRes.json()).rows || [] : []
  const gaWeeks = new Map<string, { total: number; organic: number }>()
  for (const r of ga) {
    const k = r.dimensionValues[0].value
    const w = gaWeeks.get(k) || { total: 0, organic: 0 }
    const v = parseInt(r.metricValues[0].value)
    w.total += v
    if (r.dimensionValues[1].value === 'Organic Search') w.organic += v
    gaWeeks.set(k, w)
  }

  // Compose report
  const weekKeys = [...weeks.keys()].sort()
  const fullWeeks = weekKeys.slice(0, -1) // drop the partial current week
  const lastW = weeks.get(fullWeeks[fullWeeks.length - 1])!
  const prevW = weeks.get(fullWeeks[fullWeeks.length - 2])
  const pct = (a: number, b: number) => (b > 0 ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%` : 'n/a')

  const lines: string[] = []
  lines.push(`GSC last full week: ${lastW.clicks} clicks (${pct(lastW.clicks, prevW?.clicks || 0)} WoW), ${lastW.impr.toLocaleString()} impressions (${pct(lastW.impr, prevW?.impr || 0)}), avg pos ${(lastW.posW / Math.max(lastW.impr, 1)).toFixed(1)}`)
  lines.push('')
  lines.push('Weekly trend (Mon-start | clicks | impressions | pos):')
  for (const k of fullWeeks.slice(-8)) {
    const w = weeks.get(k)!
    lines.push(`  ${k}  ${String(w.clicks).padStart(5)}  ${String(w.impr).padStart(8)}  ${(w.posW / Math.max(w.impr, 1)).toFixed(1)}`)
  }
  lines.push('')
  lines.push(`Cohorts, last 14d vs previous 14d (clicks | impressions | pages with impressions):`)
  const cohorts = [...new Set([...curCo.keys(), ...prevCo.keys()])].sort((a, b) => (curCo.get(b)?.impr || 0) - (curCo.get(a)?.impr || 0))
  for (const c of cohorts) {
    const cu = curCo.get(c) || { clicks: 0, impr: 0, posW: 0, pages: 0 }
    const pr = prevCo.get(c) || { clicks: 0, impr: 0, posW: 0, pages: 0 }
    lines.push(`  ${c.padEnd(18)} clicks ${pr.clicks}→${cu.clicks} (${pct(cu.clicks, pr.clicks)})  impr ${pr.impr}→${cu.impr} (${pct(cu.impr, pr.impr)})  pages ${pr.pages}→${cu.pages}`)
  }
  lines.push('')
  lines.push(`Index churn: ${lost.length} pages had >=5 impressions in the previous 14d and ZERO in the last 14d${lost.length ? ' — top losses:' : '.'}`)
  for (const r of lost.slice(0, 10)) {
    lines.push(`  -${r.impressions} impr  ${r.keys[0].replace('https://www.plantspack.com', '')}`)
  }
  lines.push('')
  lines.push('GA4 weekly sessions (total | organic):')
  for (const k of [...gaWeeks.keys()].sort().slice(-8)) {
    const w = gaWeeks.get(k)!
    lines.push(`  ${k}  ${String(w.total).padStart(5)}  ${String(w.organic).padStart(5)}`)
  }
  const report = lines.join('\n')
  console.log(report)

  if (!DRY) {
    await sendEmail({
      to: TO,
      subject: `[PlantsPack] SEO weekly: ${lastW.clicks} clicks (${pct(lastW.clicks, prevW?.clicks || 0)}), churn ${lost.length}`,
      html: `<pre style="font-family:monospace;font-size:13px">${report.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`,
      text: report,
    })
    console.log(`\n[seo-monitor] emailed to ${TO}`)
  }
  saveState({ ...state, lastSuccess: new Date().toISOString() })
}

main().catch((e) => { console.error(e); process.exit(1) })
