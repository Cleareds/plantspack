// Scrape og:image from each place's HappyCow review page (saved as `href`).
// Applies to:
//  - duplicates without main_image_url
//  - new places (coverage-boost-2026-05-15 source) without image
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const UA = 'Mozilla/5.0 Chrome/124.0 Safari/537.36'
async function ogImage(url) {
  try {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 15000)
    const r = await fetch(url, { headers: { 'user-agent': UA, accept:'text/html' }, redirect: 'follow', signal: c.signal })
    clearTimeout(t)
    if (!r.ok) return null
    const html = await r.text()
    let m = html.match(/<meta[^>]+(?:property|name)=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i)
    if (!m) m = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image/i)
    if (!m) return null
    let s = m[1]
    if (s.startsWith('//')) s = 'https:' + s
    else if (!s.startsWith('http')) try { s = new URL(s, url).toString() } catch {}
    return s.startsWith('data:') ? null : s
  } catch { return null }
}

// Load all-candidates (has href + city/country) — these are the HappyCow page refs
const cand = JSON.parse(readFileSync('scripts/seo-out/coverage-boost-2026-05-15/all-candidates.json','utf8'))
const dups = JSON.parse(readFileSync('scripts/seo-out/coverage-boost-2026-05-15/duplicates.json','utf8'))
const dupNames = new Set(dups.filter(d => !d.dbImage).map(d => d.extracted))
function norm(s) { return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim() }
const dupNormToId = new Map(dups.filter(d => !d.dbImage).map(d => [norm(d.extracted), d.dbId]))

let ok = 0, miss = 0
// 1) Update duplicates missing image
console.log('--- duplicates missing image ---')
for (const c of cand) {
  if (c.isClosed) continue
  const k = norm(c.name)
  const dbId = dupNormToId.get(k)
  if (!dbId) continue
  const url = c.href.startsWith('http') ? c.href : `https://www.happycow.net${c.href}`
  const img = await ogImage(url)
  if (img) {
    await sb.from('places').update({ main_image_url: img }).eq('id', dbId)
    console.log(`  + ${c.name}: ${img.slice(0,80)}`)
    ok++
  } else { miss++; }
}
// 2) Update newly imported places (source=coverage-boost-2026-05-15) missing image
console.log('\n--- new places missing image ---')
const { data: newPlaces } = await sb.from('places').select('id,name').eq('source','coverage-boost-2026-05-15').is('main_image_url', null)
console.log(`  target count: ${newPlaces?.length}`)
const candByName = new Map(cand.map(c => [norm(c.name), c]))
for (const p of (newPlaces||[])) {
  const k = norm(p.name)
  const c = candByName.get(k)
  if (!c) continue
  const url = c.href.startsWith('http') ? c.href : `https://www.happycow.net${c.href}`
  const img = await ogImage(url)
  if (img) {
    await sb.from('places').update({ main_image_url: img }).eq('id', p.id)
    console.log(`  + ${p.name}: ${img.slice(0,80)}`)
    ok++
  } else miss++
}
console.log(`\nTotal: ${ok} images applied, ${miss} not found.`)
