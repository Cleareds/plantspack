// Run after imports complete. Scrapes og:image for any berlin-source rows missing main_image_url.
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'

function abs(src, base) { try { return new URL(src, base).toString() } catch { return null } }

async function tryOg(url) {
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 12000)
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept:'text/html' }, redirect: 'follow', signal: ctrl.signal })
    if (!res.ok) return null
    const html = await res.text()
    let m = html.match(/<meta[^>]+(?:property|name)=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image/i)
      || html.match(/<meta[^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i)
    if (!m) return null
    let s = m[1]
    if (s.startsWith('//')) s = 'https:' + s
    else if (!s.startsWith('http')) s = abs(s, url)
    return s
  } catch { return null }
  finally { clearTimeout(to) }
}

const { data } = await sb.from('places').select('id,name,website,main_image_url')
  .eq('source','berlin-google-map-2026-05-15').is('main_image_url', null).limit(200)
console.log(`Targets without image: ${data.length}`)
let ok=0
for (const p of data) {
  if (!p.website) continue
  const img = await tryOg(p.website)
  if (img && !img.startsWith('data:')) {
    await sb.from('places').update({ main_image_url: img }).eq('id', p.id)
    console.log(`  + ${p.name}: ${img.slice(0,80)}`)
    ok++
  }
}
console.log(`\nScraped ${ok} images.`)
