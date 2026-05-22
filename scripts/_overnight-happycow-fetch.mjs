import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Aggregate hrefs from all our coverage-boost JSONs
const dir = 'scripts/seo-out/coverage-boost-2026-05-15'
const hrefByName = new Map()
function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
for (const f of readdirSync(dir)) {
  if (!f.endsWith('-happycow.json')) continue
  try {
    const list = JSON.parse(readFileSync(`${dir}/${f}`,'utf8'))
    for (const p of list) if (p.href) hrefByName.set(norm(p.name), p.href)
  } catch {}
}
console.log(`HappyCow hrefs collected: ${hrefByName.size}`)

// Fetch FV places without image
const places = []
for (const c of ['Turkey','Greece','Italy','Croatia','Portugal','Spain']) {
  let from=0
  while (true) {
    const { data } = await sb.from('places').select('id,name,city,country,main_image_url')
      .eq('country',c).eq('vegan_level','fully_vegan').is('archived_at',null).is('main_image_url',null).order('id').range(from,from+999)
    if (!data?.length) break
    places.push(...data); if (data.length<1000) break; from+=1000
  }
}
console.log(`FV no-image total: ${places.length}`)

const matched = places.map(p => ({ ...p, href: hrefByName.get(norm(p.name)) })).filter(p => p.href)
console.log(`With HappyCow href: ${matched.length}`)

let ok=0, miss=0
for (const p of matched) {
  const url = `https://www.happycow.net${p.href}`
  try {
    const html = execSync(`curl -fsSL --max-time 15 --compressed -H "Accept-Language: en" -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36" "${url}"`, { encoding:'utf8', stdio:['ignore','pipe','ignore'], maxBuffer: 5*1024*1024 })
    let m = html.match(/<meta[^>]+(?:property|name)=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image/i)
    if (m) {
      let s = m[1]
      if (s.startsWith('//')) s = 'https:' + s
      if (!s.startsWith('data:') && /happycow|cloudfront|amazon/i.test(s)) {
        await sb.from('places').update({ main_image_url: s }).eq('id', p.id)
        ok++; if (ok<=10 || ok%10===0) console.log(`+ ${p.name}: ${s.slice(0,80)}`)
        continue
      }
    }
    miss++
  } catch { miss++ }
}
console.log(`\nDone. ${ok} applied, ${miss} missed.`)
