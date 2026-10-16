// Read-only: GSC daily totals (date dimension only - a query dimension hides ~81% of clicks),
// plus page-type cohorts and countries for the last 14 days vs the 14 before. Usage: node scripts/_gsc-daily-2026-10-15.mjs
import { execSync } from 'node:child_process'
const adc = execSync('gcloud auth application-default print-access-token', { encoding: 'utf8' }).trim()
const tok = (await (await fetch('https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/plantspack-seo-bot@plantspack.iam.gserviceaccount.com:generateAccessToken',
  { method: 'POST', headers: { Authorization: `Bearer ${adc}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/webmasters.readonly'] }) })).json()).accessToken
const q = async body => (await (await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Aplantspack.com/searchAnalytics/query',
  { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ dataState: 'all', rowLimit: 25000, ...body }) })).json())
const d = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)
const daily = await q({ startDate: d(60), endDate: d(0), dimensions: ['date'] })
for (const r of daily.rows || []) console.log(r.keys[0], new Date(r.keys[0]).toUTCString().slice(0, 3), String(r.clicks).padStart(5), String(r.impressions).padStart(7), r.position.toFixed(1))
const type = u => { const p = new URL(u).pathname; return p === '/' ? 'home' : p.startsWith('/place/') ? 'place' : /^\/vegan-places\/[^/]+\/[^/]+\/[^/]+/.test(p) ? 'dish/sub' : p.startsWith('/vegan-places/') ? 'hub' : p.split('/')[1] || 'other' }
for (const [a, b, label] of [[d(17), d(4), 'last 14d (to -4d)'], [d(31), d(18), 'prior 14d']]) {
  const pages = await q({ startDate: a, endDate: b, dimensions: ['page'] })
  const t = {}
  for (const r of pages.rows || []) { const k = type(r.keys[0]); t[k] ||= [0, 0]; t[k][0] += r.clicks; t[k][1] += r.impressions }
  console.log(label, a, b, JSON.stringify(Object.fromEntries(Object.entries(t).sort((x, y) => y[1][0] - x[1][0]).slice(0, 10))))
  const c = await q({ startDate: a, endDate: b, dimensions: ['country'], rowLimit: 8 })
  console.log('  countries', (c.rows || []).map(r => `${r.keys[0]}:${r.clicks}`).join(' '))
}
