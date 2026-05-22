import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { execSync } from 'node:child_process'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const places = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('id,name,city,country,website')
    .eq('country','Germany').eq('vegan_level','fully_vegan').is('archived_at',null).is('main_image_url',null).order('id').range(from,from+999)
  if (!data?.length) break
  places.push(...data); if (data.length<1000) break; from+=1000
}
console.log(`Targets: ${places.length}`)

async function findHcCdn(name, city, country) {
  const queries = [
    `"${name}" ${city} vegan restaurant`,
    `"${name}" ${city} ${country} vegan`,
    `${name} ${city} vegan`,
  ]
  for (const q of queries) {
    try {
      const url = `https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2`
      const html = execSync(`curl -fsSL --max-time 12 -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36" "${url.replace(/"/g,'\\"')}"`, { encoding:'utf8', stdio:['ignore','pipe','ignore'], maxBuffer: 6*1024*1024 })
      const matches = [...html.matchAll(/(https:\/\/images\.happycow\.net\/venues\/(?:1024|500|250)\/[^"\\<>&\s]+?\.jpe?g)/gi)]
      const ranked = matches.map(m => m[1]).sort((a,b) => {
        const sa = a.match(/\/venues\/(\d+)\//)?.[1]
        const sbz = b.match(/\/venues\/(\d+)\//)?.[1]
        return parseInt(sbz||'0') - parseInt(sa||'0')
      })
      if (ranked.length) return { src: ranked[0], query: q }
    } catch {}
  }
  return null
}

let ok = 0, miss = 0
const concurrency = 5
let cursor = 0
async function worker() {
  while (cursor < places.length) {
    const i = cursor++
    const p = places[i]
    const found = await findHcCdn(p.name, p.city, p.country)
    if (found) {
      await sb.from('places').update({ main_image_url: found.src }).eq('id', p.id)
      ok++
      if (ok <= 30 || ok % 10 === 0) console.log(`+ [${ok}] ${p.name} [${p.city}]: ${found.src.slice(60)}`)
    } else { miss++ }
  }
}
await Promise.all(Array.from({length: concurrency}, () => worker()))
console.log(`\nDone. ${ok}/${places.length} applied, ${miss} missed.`)
