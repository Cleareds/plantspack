// Read-only: which stored websites point at a domain that does not exist (NXDOMAIN)?
// A dead domain is the cheapest fabrication / closure signal (wellness-import lesson).
// Dead = NXDOMAIN on BOTH 1.1.1.1 and 8.8.8.8 (A and AAAA), checked twice.
// Timeouts / SERVFAIL are "unknown", never dead.
// Usage: node scripts/_dq-dead-domains-2026-10-15.mjs reports/dq-2026-10-15/live.json
import fs from 'node:fs'
import { Resolver } from 'node:dns/promises'

const live = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const host = u => { try { return new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u).hostname.toLowerCase().replace(/\.$/, '') } catch { return null } }
// Shared platforms: the domain resolves whatever the page says, so they say nothing here.
const SHARED = /(^|\.)(facebook|instagram|google|goo|linktr|wixsite|squarespace|business\.site|tripadvisor|yelp|happycow|ubereats|deliveroo|wolt|lieferando|thefork|ifood)\./
const byHost = {}
for (const p of live) {
  if (!p.website) continue
  const h = host(p.website)
  if (!h || SHARED.test(h + '.')) continue
  ;(byHost[h] ||= []).push(p.id)
}
const hosts = Object.keys(byHost)
console.log(`websites ${live.filter(p => p.website).length}, distinct hosts checked ${hosts.length}`)

const R = ['1.1.1.1', '8.8.8.8'].map(ip => { const r = new Resolver({ timeout: 2500, tries: 1 }); r.setServers([ip]); return r })
async function nx(r, h) {
  try { await r.resolve4(h); return false } catch (e) {
    if (e.code === 'ENOTFOUND') {
      try { await r.resolve6(h); return false } catch (e6) { return e6.code === 'ENOTFOUND' || e6.code === 'ENODATA' ? true : null }
    }
    if (e.code === 'ENODATA') { try { await r.resolve6(h); return false } catch { return null } }
    return null
  }
}
// Hard cap per host: a hung lookup counts as "unknown", never dead.
const dead = h => Promise.race([deadInner(h), new Promise(r => setTimeout(() => r(null), 15000))])
async function deadInner(h) {
  // A "www." host can be missing while the bare domain is alive: try both.
  const names = h.startsWith('www.') ? [h, h.slice(4)] : [h, 'www.' + h]
  for (const r of R) for (const n of names) { const v = await nx(r, n); if (v !== true) return v }
  return true
}
const res = { dead: [], unknown: [] }
let i = 0
async function worker() {
  while (i < hosts.length) {
    const h = hosts[i++]
    const v = await dead(h)
    if (v === true) res.dead.push(h)
    else if (v === null) res.unknown.push(h)
    if (i % 1000 === 0) console.log(`  ${i}/${hosts.length} dead ${res.dead.length} unknown ${res.unknown.length}`)
  }
}
// 40 parallel lookups made the public resolvers throttle us (a run of timeouts): keep it at 12.
await Promise.all(Array.from({ length: 12 }, worker))
fs.writeFileSync(process.argv[2].replace(/live\.json$/, 'dead-domains-pass1.json'), JSON.stringify(res))
// Second pass on the dead set only, a few seconds later (transient resolver errors).
await new Promise(r => setTimeout(r, 5000))
const confirmed = []
let j = 0
await Promise.all(Array.from({ length: 6 }, async () => {
  while (j < res.dead.length) { const h = res.dead[j++]; if (await dead(h) === true) confirmed.push(h) }
}))

const rows = confirmed.flatMap(h => byHost[h].map(id => {
  const p = live.find(x => x.id === id)
  return { id, name: p.name, city: p.city, country: p.country, website: p.website, host: h, source: p.source, vegan_level: p.vegan_level,
    osm_ref: p.osm_ref, created_by: p.created_by, review_count: p.review_count || 0 }
}))
const bySrc = {}
for (const r of rows) bySrc[r.source || 'null'] = (bySrc[r.source || 'null'] || 0) + 1
console.log(`dead hosts ${confirmed.length}, places ${rows.length}, unknown hosts ${res.unknown.length}`)
console.log(Object.entries(bySrc).sort((a, b) => b[1] - a[1]))
fs.writeFileSync(process.argv[2].replace(/live\.json$/, 'dead-domains.json'), JSON.stringify(rows, null, 1))
