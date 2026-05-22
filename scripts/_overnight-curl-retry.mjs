// Retry og:image scrape using curl with relaxed TLS (handles older sites)
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { execSync } from 'node:child_process'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const places = []
for (const country of ['Turkey','Greece','Italy','Croatia','Portugal','Spain']) {
  let from = 0
  while (true) {
    const { data } = await sb.from('places').select('id,name,city,country,website,main_image_url')
      .eq('country',country).eq('vegan_level','fully_vegan').is('archived_at',null).is('main_image_url', null).not('website','is',null).order('id').range(from, from+999)
    if (!data?.length) break
    places.push(...data); if (data.length < 1000) break; from += 1000
  }
}
console.log(`FV missing image but have website: ${places.length}`)
let ok = 0, miss = 0
for (const p of places) {
  const url = (p.website || '').split(';')[0].trim()
  if (!url) continue
  try {
    const html = execSync(`curl -fsSL --insecure --max-time 12 -A "Mozilla/5.0 Chrome/124.0" "${url.replace(/"/g,'\\"')}"`, { encoding:'utf8', stdio:['ignore','pipe','ignore'], maxBuffer: 5*1024*1024 })
    let m = html.match(/<meta[^>]+(?:property|name)=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image/i)
      || html.match(/<meta[^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i)
    if (m) {
      let s = m[1]
      if (s.startsWith('//')) s = 'https:' + s
      else if (!s.startsWith('http')) try { s = new URL(s, url).toString() } catch {}
      if (!s.startsWith('data:')) {
        await sb.from('places').update({ main_image_url: s }).eq('id', p.id)
        ok++; console.log(`+ ${p.name}: ${s.slice(0,70)}`)
        continue
      }
    }
    miss++
  } catch { miss++ }
}
console.log(`\nDone. ${ok} applied, ${miss} missed.`)
