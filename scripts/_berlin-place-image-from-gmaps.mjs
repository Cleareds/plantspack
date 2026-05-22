// Fallback image fetcher: for places without a website, try a duckduckgo/wikipedia fetch.
// Lightweight: just attempts og:image from `https://duckduckgo.com/?q=<name>+berlin+restaurant`
// (DDG search results don't have og:image of the venue, so this is unlikely to help)
// Instead: try Wikipedia and HappyCow public pages.
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const UA = 'Mozilla/5.0 Chrome/124.0'
async function fetchHtml(url) {
  try {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 10000)
    const r = await fetch(url, { headers: { 'user-agent': UA }, signal: c.signal, redirect: 'follow' })
    clearTimeout(t)
    if (!r.ok) return null
    return await r.text()
  } catch { return null }
}
async function ogImage(html, baseUrl) {
  if (!html) return null
  let m = html.match(/<meta[^>]+(?:property|name)=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i)
  if (!m) m = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image/i)
  if (!m) return null
  let s = m[1]
  if (s.startsWith('//')) s = 'https:' + s
  else if (!s.startsWith('http') && baseUrl) try { s = new URL(s, baseUrl).toString() } catch {}
  return s.startsWith('data:') ? null : s
}
const { data } = await sb.from('places').select('id,name')
  .eq('source','berlin-google-map-2026-05-15').is('main_image_url', null).limit(200)
console.log(`Places without image: ${data?.length || 0}`)
let ok = 0
for (const p of (data||[])) {
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  // Try happycow public page (their /reviews/ URLs are public)
  // Pattern: https://www.happycow.net/reviews/<slug>-berlin-...
  const candidates = [
    `https://www.happycow.net/reviews/${slug}-berlin`,
    `https://www.happycow.net/reviews/${slug.replace(/-/g,'')}-berlin`,
  ]
  let found = null
  for (const c of candidates) {
    const html = await fetchHtml(c)
    if (html) {
      const img = await ogImage(html, c)
      if (img) { found = img; break }
    }
  }
  if (found) {
    await sb.from('places').update({ main_image_url: found }).eq('id', p.id)
    console.log(`  + ${p.name}: ${found.slice(0,80)}`)
    ok++
  }
}
console.log(`Found ${ok} via fallback`)
