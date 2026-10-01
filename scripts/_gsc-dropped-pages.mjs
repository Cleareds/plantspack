#!/usr/bin/env node
// Index churn drill-down: pages with >=5 impressions in the previous 14 days
// and ZERO in the last 14 days (the "Index churn" line in seo-monitor.ts),
// grouped by cohort + country, then probed live (HTTP status, meta robots,
// canonical) so we can tell "we noindexed it" from "Google dropped it".
// Read-only. UNFILTERED page-dimension pulls (see project_gsc_anonymized_query_trap).
import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'

const SA = 'plantspack-seo-bot@plantspack.iam.gserviceaccount.com'
const SITE = encodeURIComponent('sc-domain:plantspack.com')

function userToken() {
  for (const cmd of ['gcloud auth application-default print-access-token', 'gcloud auth print-access-token']) {
    try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { /* next */ }
  }
  return null
}
async function saToken() {
  const ut = userToken()
  if (!ut) throw new Error('no gcloud token - run: gcloud auth application-default login')
  const res = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SA}:generateAccessToken`, {
    method: 'POST', headers: { Authorization: `Bearer ${ut}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/webmasters.readonly'] }),
  })
  if (!res.ok) throw new Error(`mint failed ${res.status}: ${await res.text()}`)
  return (await res.json()).accessToken
}
async function gscAll(token, body) {
  const rows = []
  for (let startRow = 0; ; startRow += 25000) {
    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${SITE}/searchAnalytics/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, rowLimit: 25000, startRow }),
    })
    if (!res.ok) throw new Error(`gsc ${res.status}: ${await res.text()}`)
    const page = (await res.json()).rows ?? []
    rows.push(...page)
    if (page.length < 25000) break
  }
  return rows
}
const iso = d => d.toISOString().slice(0, 10)
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d }
function cohortOf(u) {
  const p = new URL(u).pathname
  if (/^\/vegan-places\/[^/]+\/[^/]+\/best-vegan\//.test(p)) return 'dish'
  if (/^\/vegan-places\/[^/]+\/fully-vegan$/.test(p) || /^\/vegan-places\/[^/]+\/[^/]+\/fully-vegan$/.test(p)) return 'hub-fv'
  if (/^\/vegan-places\/[^/]+\/[^/]+/.test(p)) return 'city-hub'
  if (/^\/vegan-places\/[^/]+$/.test(p)) return 'country-hub'
  if (p.startsWith('/place/')) return 'place'
  if (p.startsWith('/recipe')) return 'recipe'
  if (p.startsWith('/event')) return 'event'
  if (p.startsWith('/vegan/')) return 'article'
  if (p.startsWith('/tools')) return 'tools'
  return 'other'
}
const countryOf = u => (new URL(u).pathname.match(/^\/vegan-places\/([^/]+)/) || [])[1] || '-'

const token = await saToken()
// GSC data lags ~2-3 days; mirror seo-monitor's windows.
const last = { startDate: iso(daysAgo(16)), endDate: iso(daysAgo(3)) }
const prev = { startDate: iso(daysAgo(30)), endDate: iso(daysAgo(17)) }
console.log(`prev ${prev.startDate}..${prev.endDate}  last ${last.startDate}..${last.endDate}`)
const [prevRows, lastRows] = await Promise.all([
  gscAll(token, { ...prev, dimensions: ['page'] }),
  gscAll(token, { ...last, dimensions: ['page'] }),
])
const lastSet = new Set(lastRows.map(r => r.keys[0]))
const dropped = prevRows
  .filter(r => r.impressions >= 5 && !lastSet.has(r.keys[0]))
  .map(r => ({ url: r.keys[0], impr: r.impressions, clicks: r.clicks, pos: +r.position.toFixed(1), cohort: cohortOf(r.keys[0]), country: countryOf(r.keys[0]) }))
  .sort((a, b) => b.impr - a.impr)
console.log(`pages with >=5 impr before: ${prevRows.filter(r => r.impressions >= 5).length}; dropped to zero: ${dropped.length}; impressions lost: ${dropped.reduce((a, r) => a + r.impr, 0)}; clicks lost: ${dropped.reduce((a, r) => a + r.clicks, 0)}`)
const by = (key) => { const m = {}; for (const r of dropped) { const k = r[key]; m[k] ??= { n: 0, impr: 0, clicks: 0 }; m[k].n++; m[k].impr += r.impr; m[k].clicks += r.clicks } return Object.entries(m).sort((a, b) => b[1].impr - a[1].impr) }
console.log('\nby cohort (n / impr lost / clicks lost):'); for (const [k, v] of by('cohort')) console.log(`  ${k.padEnd(12)} ${String(v.n).padStart(5)} ${String(v.impr).padStart(7)} ${String(v.clicks).padStart(5)}`)
console.log('\nby country (vegan-places only, top 15):'); for (const [k, v] of by('country').filter(([k]) => k !== '-').slice(0, 15)) console.log(`  ${k.padEnd(28)} ${String(v.n).padStart(5)} ${String(v.impr).padStart(7)} ${String(v.clicks).padStart(5)}`)

// Live probe: a stratified sample per cohort. GET (not HEAD) so we can read
// <meta name="robots"> and the canonical. Sequential with a small pause.
const sample = []
for (const c of ['dish', 'place', 'city-hub', 'hub-fv', 'country-hub', 'recipe', 'event', 'other']) sample.push(...dropped.filter(r => r.cohort === c).slice(0, c === 'dish' || c === 'place' ? 25 : 8))
console.log(`\nprobing ${sample.length} URLs live...`)
for (const r of sample) {
  try {
    const res = await fetch(r.url, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 plantspack-seo-audit' } })
    r.status = res.status
    r.location = res.headers.get('location') || undefined
    r.xrobots = res.headers.get('x-robots-tag') || undefined
    if (res.status === 200) {
      const html = await res.text()
      r.noindex = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html) || undefined
      const canon = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)
      r.canonical = canon ? canon[1] : undefined
      r.canonMismatch = r.canonical && r.canonical.replace(/\/$/, '') !== r.url.replace(/\/$/, '') ? true : undefined
    }
  } catch (e) { r.status = 'ERR ' + e.message }
  await new Promise(s => setTimeout(s, 150))
}
const verdict = r => r.status !== 200 ? `HTTP ${r.status}${r.location ? ' -> ' + r.location.replace('https://www.plantspack.com', '') : ''}` : r.noindex ? 'noindex' : r.canonMismatch ? 'canonical elsewhere' : 'indexable 200'
console.log('\nprobe verdicts by cohort:')
for (const c of [...new Set(sample.map(r => r.cohort))]) {
  const m = {}; for (const r of sample.filter(r => r.cohort === c)) { const v = verdict(r).replace(/ -> .*/, ''); m[v] = (m[v] || 0) + 1 }
  console.log(`  ${c.padEnd(12)}`, JSON.stringify(m))
}
console.log('\ntop 25 dropped with verdict:')
for (const r of dropped.slice(0, 25)) { const s = sample.find(x => x.url === r.url); console.log(`  -${String(r.impr).padStart(4)} impr ${String(r.clicks).padStart(3)} clk  ${r.url.replace('https://www.plantspack.com', '').padEnd(70)} ${s ? verdict(s) : ''}`) }

mkdirSync('reports/seo-dropped', { recursive: true })
const out = `reports/seo-dropped/${iso(new Date())}.json`
writeFileSync(out, JSON.stringify({ windows: { prev, last }, dropped, sample }, null, 1))
console.log(`\nwrote ${out}`)
