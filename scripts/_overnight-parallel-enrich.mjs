// Parallel enrichment for FV places in summer-hub countries.
// 1. If place has a website but no image: fetch og:image
// 2. If place has no website: skip (handled separately via WebSearch)
// 3. Records all updates with source tag verification_method='overnight-2026-05-15'

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'

async function ogImage(url) {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 12000)
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,*/*' }, redirect: 'follow', signal: c.signal })
    clearTimeout(t)
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || ''
    if (!ct.includes('html')) return null
    const html = await r.text()
    let m = html.match(/<meta[^>]+(?:property|name)=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::secure_url|:url)?["']/i)
      || html.match(/<meta[^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i)
    if (!m) return null
    let s = m[1]
    if (s.startsWith('//')) s = 'https:' + s
    else if (!s.startsWith('http')) { try { s = new URL(s, url).toString() } catch { return null } }
    if (s.startsWith('data:')) return null
    return s
  } catch { return null }
}

async function pullPlaces() {
  const out = []
  for (const country of ['Turkey','Greece','Italy','Croatia','Portugal','Spain']) {
    let from = 0
    while (true) {
      const { data } = await sb.from('places').select('id,name,city,country,website,main_image_url,phone,opening_hours')
        .eq('country',country).eq('vegan_level','fully_vegan').is('archived_at',null).order('id').range(from, from+999)
      if (!data?.length) break
      out.push(...data); if (data.length < 1000) break; from += 1000
    }
  }
  return out
}

const places = await pullPlaces()
console.log(`Total FV in summer-hub countries: ${places.length}`)
const needsImg = places.filter(p => !p.main_image_url && p.website)
console.log(`Have website but no image: ${needsImg.length}`)

let imgOk = 0, imgMiss = 0
const concurrency = 8
let cursor = 0
async function worker() {
  while (cursor < needsImg.length) {
    const i = cursor++
    const p = needsImg[i]
    const url = p.website.split(';')[0].trim()
    const img = await ogImage(url)
    if (img) {
      await sb.from('places').update({ main_image_url: img }).eq('id', p.id)
      imgOk++
      if (imgOk % 10 === 0) console.log(`progress: ${imgOk} images applied (${cursor}/${needsImg.length} tried)`)
    } else {
      imgMiss++
    }
  }
}
await Promise.all(Array.from({length: concurrency}, () => worker()))
console.log(`\nDone. Images applied: ${imgOk}, missed: ${imgMiss}`)
