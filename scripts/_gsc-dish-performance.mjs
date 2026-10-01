#!/usr/bin/env node
// Which dish keywords and countries earn the dish-page clicks (28d, unfiltered
// page-dimension pull), plus hub clicks by country. Input for deciding where
// to expand dish coverage. Read-only.
import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
const SA = 'plantspack-seo-bot@plantspack.iam.gserviceaccount.com'
const SITE = encodeURIComponent('sc-domain:plantspack.com')
function userToken() { for (const cmd of ['gcloud auth application-default print-access-token', 'gcloud auth print-access-token']) { try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch {} } return null }
async function saToken() { const ut = userToken(); if (!ut) throw new Error('no gcloud token'); const res = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SA}:generateAccessToken`, { method: 'POST', headers: { Authorization: `Bearer ${ut}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/webmasters.readonly'] }) }); if (!res.ok) throw new Error(await res.text()); return (await res.json()).accessToken }
async function gscAll(token, body) { const rows = []; for (let startRow = 0; ; startRow += 25000) { const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${SITE}/searchAnalytics/query`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, rowLimit: 25000, startRow }) }); if (!res.ok) throw new Error(await res.text()); const page = (await res.json()).rows ?? []; rows.push(...page); if (page.length < 25000) break } return rows }
const iso = d => d.toISOString().slice(0, 10); const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d }
const token = await saToken()
const win = { startDate: iso(daysAgo(30)), endDate: iso(daysAgo(3)) }
const rows = await gscAll(token, { ...win, dimensions: ['page'] })
console.log(`window ${win.startDate}..${win.endDate}, ${rows.length} pages`)
const agg = (key) => { const m = {}; return { add(k, r) { m[k] ??= { pages: 0, clicks: 0, impr: 0 }; m[k].pages++; m[k].clicks += r.clicks; m[k].impr += r.impressions }, rows: () => Object.entries(m).sort((a, b) => b[1].clicks - a[1].clicks) } }
const byDish = agg(), byDishCountry = agg(), hubByCountry = agg(), dishByCountry = agg()
let dishPages = 0, dishClicks = 0, zeroClickDish = 0
for (const r of rows) {
  const p = new URL(r.keys[0]).pathname
  let m = p.match(/^\/vegan-places\/([^/]+)\/([^/]+)\/best-vegan\/([^/]+)$/)
  if (m) { dishPages++; dishClicks += r.clicks; if (!r.clicks) zeroClickDish++; byDish.add(m[3], r); byDishCountry.add(`${m[3]} | ${m[1]}`, r); dishByCountry.add(m[1], r); continue }
  m = p.match(/^\/vegan-places\/([^/]+)(\/[^/]+)?$/)
  if (m && m[2] !== '/fully-vegan') hubByCountry.add(m[1], r)
}
console.log(`dish pages with impressions: ${dishPages}, clicks ${dishClicks}, zero-click pages ${zeroClickDish}`)
const show = (title, a, n) => { console.log(`\n${title} (pages / clicks / impr / CTR):`); for (const [k, v] of a.rows().slice(0, n)) console.log(`  ${k.padEnd(34)} ${String(v.pages).padStart(5)} ${String(v.clicks).padStart(6)} ${String(v.impr).padStart(8)} ${(100 * v.clicks / Math.max(1, v.impr)).toFixed(1).padStart(5)}%`) }
show('by dish', byDish, 40)
show('dish pages by country', dishByCountry, 20)
show('hub (country+city) pages by country', hubByCountry, 20)
show('dish x country', byDishCountry, 30)
writeFileSync(`reports/seo-dropped/dish-performance-${iso(new Date())}.json`, JSON.stringify({ win, byDish: byDish.rows(), dishByCountry: dishByCountry.rows(), hubByCountry: hubByCountry.rows(), byDishCountry: byDishCountry.rows() }, null, 1))
