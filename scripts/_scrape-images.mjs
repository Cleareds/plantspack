import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const TARGETS = JSON.parse(readFileSync('scripts/seo-out/summer-hub-audit-2026-05-15/image-targets.json','utf8'))
const RESULTS_PATH = 'scripts/seo-out/summer-hub-audit-2026-05-15/image-scrape-results.json'
const results = existsSync(RESULTS_PATH) ? JSON.parse(readFileSync(RESULTS_PATH,'utf8')) : {}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

function absolutize(src, base) {
  if (!src) return null
  if (src.startsWith('//')) return 'https:' + src
  if (src.startsWith('http')) return src
  try { return new URL(src, base).toString() } catch { return null }
}

function extractCandidates(html, baseUrl) {
  const out = []
  // og:image, twitter:image
  const metaRe = /<meta\s+[^>]*?(?:property|name)=["'](og:image(?::secure_url|:url)?|twitter:image(?::src)?)["'][^>]*?content=["']([^"']+)["']/gi
  let m
  while ((m = metaRe.exec(html))) out.push({ src: m[2], kind: 'meta:'+m[1] })
  // Reverse content/property order
  const metaRe2 = /<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["'](og:image(?::secure_url|:url)?|twitter:image(?::src)?)["']/gi
  while ((m = metaRe2.exec(html))) out.push({ src: m[1], kind: 'meta:'+m[2] })
  // First few <img> srcs (hero candidates) — skip obvious icons
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi
  let count = 0
  while ((m = imgRe.exec(html)) && count < 8) {
    const src = m[1]
    if (/logo|icon|favicon|sprite|placeholder|avatar/i.test(src)) continue
    if (/\.svg(\?|$)/i.test(src)) continue
    out.push({ src, kind: 'img' })
    count++
  }
  return out.map(c => ({ ...c, url: absolutize(c.src, baseUrl) })).filter(c => c.url)
}

async function fetchHtml(url) {
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 15000)
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,*/*' }, redirect: 'follow', signal: ctrl.signal })
    if (!res.ok) return { error: `http ${res.status}` }
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('html')) return { error: `not html (${ct})` }
    const html = await res.text()
    return { html, finalUrl: res.url }
  } catch (e) {
    return { error: e.name === 'AbortError' ? 'timeout' : e.message }
  } finally { clearTimeout(to) }
}

async function headOk(url) {
  try {
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), 8000)
    const r = await fetch(url, { method: 'HEAD', headers: { 'user-agent': UA }, signal: ctrl.signal })
    clearTimeout(to)
    if (!r.ok) return { ok: false, error: `http ${r.status}` }
    const ct = r.headers.get('content-type') || ''
    if (!ct.startsWith('image/')) return { ok: false, error: `not image (${ct})` }
    const len = parseInt(r.headers.get('content-length') || '0', 10)
    return { ok: true, contentType: ct, size: len }
  } catch (e) { return { ok: false, error: e.message } }
}

const scrapable = TARGETS.filter(t => t.website && t.website.trim() && !results[t.id])
console.log(`Scraping ${scrapable.length} targets...`)
let done = 0
for (const t of scrapable) {
  const site = t.website.split(';')[0].trim()
  let pageUrl = site
  if (!/^https?:\/\//.test(pageUrl)) pageUrl = 'https://' + pageUrl
  process.stdout.write(`[${++done}/${scrapable.length}] ${t.name} (${t.city}) — ${pageUrl} ... `)
  const { html, error, finalUrl } = await fetchHtml(pageUrl)
  if (error) {
    console.log(`FAIL ${error}`)
    results[t.id] = { name: t.name, city: t.city, website: pageUrl, error }
    continue
  }
  const cands = extractCandidates(html, finalUrl || pageUrl)
  // Prefer og:image first
  let picked = null
  for (const c of cands) {
    if (!c.kind.startsWith('meta:')) continue
    const ok = await headOk(c.url)
    if (ok.ok && (ok.size === 0 || ok.size > 5000)) { picked = { ...c, ...ok }; break }
  }
  if (!picked) {
    for (const c of cands) {
      if (c.kind !== 'img') continue
      const ok = await headOk(c.url)
      if (ok.ok && (ok.size === 0 || ok.size > 15000)) { picked = { ...c, ...ok }; break }
    }
  }
  if (picked) {
    console.log(`OK ${picked.kind} → ${picked.url.slice(0,80)}`)
    results[t.id] = { name: t.name, city: t.city, website: pageUrl, picked }
  } else {
    console.log(`NO candidate found (${cands.length} tried)`)
    results[t.id] = { name: t.name, city: t.city, website: pageUrl, error: 'no_image_found', tried: cands.length }
  }
  if (done % 5 === 0) writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2))
}
writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2))
const ok = Object.values(results).filter(r => r.picked).length
const fail = Object.values(results).filter(r => r.error).length
console.log(`\nDone. ${ok} images found, ${fail} failures.`)
