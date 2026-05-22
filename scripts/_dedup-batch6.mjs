import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, writeFileSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const candidates = JSON.parse(readFileSync('scripts/seo-out/longtail-overnight-2026-05-16/candidates-batch6.json','utf8'))
function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
const dbAll = []
for (const country of ['Italy','Spain','Portugal','Greece','Turkey','Croatia']) {
  let from=0; while (true) { const {data} = await sb.from('places').select('id,name,city,country,vegan_level').eq('country',country).is('archived_at',null).order('id').range(from,from+999); if(!data?.length) break; dbAll.push(...data); if(data.length<1000)break; from+=1000 }
}
const dbByNorm = new Map(dbAll.map(p => [norm(p.name), p]))
const newOnes = []; const promos = []
for (const c of candidates) {
  const k = norm(c.name)
  let m = dbByNorm.get(k)
  if (!m) for (const p of dbAll) { if (p.country !== c.country) continue; const pn = norm(p.name); if (pn.length<6||k.length<6) continue; if (pn===k||pn.includes(k)||k.includes(pn)) {m=p; break} }
  if (m) {
    const order = { vegan_options:1, vegan_friendly:2, mostly_vegan:3, fully_vegan:4 }
    if (order[c.level] > order[m.vegan_level]) promos.push({ id: m.id, name: m.name, from: m.vegan_level, to: c.level })
  } else newOnes.push(c)
}
console.log(`Batch6: ${newOnes.length} new, ${promos.length} promotions`)
const ccmap = { Italy:'it', Spain:'es', Portugal:'pt', Greece:'gr', Turkey:'tr', Croatia:'hr' }
const payloads = newOnes.map(c => ({
  name: c.name, city: c.city, country: c.country,
  country_code: ccmap[c.country], category: 'eat', vegan_level: c.level,
  description: c.note, address: `${c.city}, ${c.country}`,
  source: 'longtail-overnight-2026-05-16',
  source_id: `${c.country.toLowerCase()}-longtail-overnight-${norm(c.name).replace(/\s+/g,'-')}`,
  tags: ['longtail-overnight-2026-05-16']
}))
writeFileSync('scripts/seo-out/longtail-overnight-2026-05-16/payloads-batch6.json', JSON.stringify(payloads, null, 2))
for (const p of promos) {
  await sb.from('places').update({ vegan_level: p.to, verification_level: 2, verification_method: 'longtail-overnight-2026-05-16', last_verified_at: new Date().toISOString() }).eq('id', p.id)
  console.log(`+ promote ${p.name}: ${p.from} -> ${p.to}`)
}
