import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
const R = JSON.parse(readFileSync('scripts/seo-out/summer-hub-audit-2026-05-15/image-scrape-results.json','utf8'))
const failed = Object.entries(R).filter(([id, r]) =>
  r.error && !r.website.includes('facebook.com') && !r.website.includes('instagram.com'))
console.log(`Retrying ${failed.length} via curl...`)
const out = {}
let done = 0
for (const [id, r] of failed) {
  done++
  const url = r.website
  try {
    const html = execSync(`curl -fsSL --insecure --max-time 20 -A "Mozilla/5.0 Chrome/124.0" "${url.replace(/"/g,'\\"')}"`, { encoding:'utf8', stdio:['ignore','pipe','ignore'], maxBuffer: 5*1024*1024 })
    let m = html.match(/<meta[^>]+(?:property|name)=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image/i)
    if (!m) m = html.match(/<meta[^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i)
    if (m) {
      let src = m[1]
      if (src.startsWith('//')) src = 'https:' + src
      else if (!src.startsWith('http')) {
        try { src = new URL(src, url).toString() } catch {}
      }
      out[id] = { name: r.name, city: r.city, website: url, picked: { url: src, kind: 'meta:og:image' } }
      console.log(`[${done}/${failed.length}] OK ${r.name} → ${src.slice(0,80)}`)
    } else {
      out[id] = { name: r.name, city: r.city, website: url, error: 'no og:image' }
    }
  } catch (e) {
    out[id] = { name: r.name, city: r.city, website: url, error: 'curl failed' }
  }
}
writeFileSync('scripts/seo-out/summer-hub-audit-2026-05-15/image-curl-retry.json', JSON.stringify(out, null, 2))
const ok = Object.values(out).filter(r => r.picked).length
console.log(`\nDone. ${ok}/${failed.length} recovered.`)
