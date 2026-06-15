#!/usr/bin/env node
// GSC opportunity extractor.
// Input:  GSC export folder containing Запити.csv (queries) + Сторінки.csv (pages)
// Output: <folder>/opportunities.csv — rank 8-25 with impressions >= 10, sorted by upside.
// Usage: node scripts/gsc-opportunities.mjs "GSC/15.06/plantspack.com-Performance-on-Search-2026-06-15"
import fs from 'node:fs'
import path from 'node:path'

const folder = process.argv[2]
if (!folder) { console.error('usage: node scripts/gsc-opportunities.mjs <gsc-folder>'); process.exit(1) }

function parseCsv(file) {
  const txt = fs.readFileSync(file, 'utf8').trim()
  const lines = txt.split(/\r?\n/)
  const header = lines.shift().split(',')
  return lines.map(line => {
    // simple CSV — GSC doesn't quote-escape commas in our columns
    const cols = line.split(',')
    return Object.fromEntries(header.map((h, i) => [h, cols[i]]))
  })
}

const queries = parseCsv(path.join(folder, 'Запити.csv'))
const pages = parseCsv(path.join(folder, 'Сторінки.csv'))

// Normalise field names — GSC Ukrainian export uses: Звертання, Покази, CTR, Позиція
const toNum = (s) => parseFloat((s ?? '').replace('%', '')) || 0

// Score = projected extra clicks if we move from current rank to position 3.
// CTR curve from Advanced Web Ranking 2024 averages: 1→27%, 2→14%, 3→9%, 5→5%, 10→2%, 15→1%, 20→0.5%
const CTR_AT = { 1: 0.27, 2: 0.14, 3: 0.09, 4: 0.06, 5: 0.05, 6: 0.04, 7: 0.03, 8: 0.025, 9: 0.022, 10: 0.02, 11: 0.018, 12: 0.015, 13: 0.013, 14: 0.011, 15: 0.01, 16: 0.009, 17: 0.008, 18: 0.007, 19: 0.006, 20: 0.005, 25: 0.003, 30: 0.002, 50: 0.001 }
function ctrFor(pos) {
  const p = Math.round(pos)
  if (CTR_AT[p]) return CTR_AT[p]
  const keys = Object.keys(CTR_AT).map(Number).sort((a,b)=>a-b)
  for (let i = 0; i < keys.length - 1; i++) {
    if (p >= keys[i] && p <= keys[i+1]) {
      const t = (p - keys[i]) / (keys[i+1] - keys[i])
      return CTR_AT[keys[i]] + t * (CTR_AT[keys[i+1]] - CTR_AT[keys[i]])
    }
  }
  return 0.0005
}

const filtered = queries
  .map(r => ({
    query: r['Найпопулярніші запити'],
    clicks: +r['Звертання'],
    impr: +r['Покази'],
    ctr: toNum(r['CTR']),
    pos: parseFloat(r['Позиція']),
  }))
  .filter(r => r.pos >= 8 && r.pos <= 25 && r.impr >= 10)
  .map(r => {
    const projectedCtr = ctrFor(3) // if we get to pos 3
    const projectedClicks = r.impr * projectedCtr
    const upside = projectedClicks - r.clicks
    return { ...r, upside: +upside.toFixed(1) }
  })
  .sort((a, b) => b.upside - a.upside)

// Best-guess target page: pick the page CSV row whose URL contains the most query tokens.
const pageRows = pages.map(r => ({ url: r['Найпопулярніші сторінки'] || r['URL'] || Object.values(r)[0], impr: +r['Покази'] }))

function guessPage(query) {
  const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length >= 3 && !['vegan','near','restaurant','restaurants','cafe','food','place','places','best'].includes(t))
  if (!tokens.length) return ''
  let best = null, bestScore = 0
  for (const p of pageRows) {
    if (!p.url) continue
    const u = decodeURIComponent(p.url).toLowerCase()
    const score = tokens.reduce((s, t) => s + (u.includes(t) ? 1 : 0), 0)
    if (score > bestScore) { bestScore = score; best = p.url }
  }
  return bestScore >= 1 ? best : ''
}

const out = ['query,position,impressions,clicks,ctr_%,projected_clicks_at_pos3,upside_clicks,best_guess_page']
for (const r of filtered) {
  const guess = guessPage(r.query)
  const projected = (r.impr * ctrFor(3)).toFixed(1)
  out.push([JSON.stringify(r.query), r.pos.toFixed(1), r.impr, r.clicks, r.ctr, projected, r.upside, JSON.stringify(guess)].join(','))
}
const outFile = path.join(folder, 'opportunities.csv')
fs.writeFileSync(outFile, out.join('\n'))
console.log(`Wrote ${filtered.length} opportunities to ${outFile}`)
console.log('\nTop 15 by projected upside:')
console.log('upside  pos   impr  query                                    →  page')
for (const r of filtered.slice(0, 15)) {
  const guess = guessPage(r.query)
  console.log(`${String(r.upside).padStart(5)}   ${r.pos.toFixed(1).padStart(4)}  ${String(r.impr).padStart(5)}  ${r.query.padEnd(40).slice(0,40)}   ${guess || '(no match)'}`)
}
