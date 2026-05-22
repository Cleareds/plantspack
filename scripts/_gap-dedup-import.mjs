import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const cand = JSON.parse(readFileSync('scripts/seo-out/coverage-boost-2026-05-15/gap-cities-candidates.json','utf8'))
function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
const dbAll = []
for (const country of ['Spain','Italy','Greece']) {
  let from=0; while(true){ const {data}=await sb.from('places').select('id,name,city,country,vegan_level').eq('country',country).is('archived_at',null).order('id').range(from,from+999); if(!data?.length) break; dbAll.push(...data); if(data.length<1000)break; from+=1000 }
}
const dbByNorm = new Map(dbAll.map(p => [norm(p.name), p]))
const newOnes = []
for (const c of cand) {
  const k = norm(c.name)
  let m = dbByNorm.get(k)
  if (!m) for (const p of dbAll) { if (p.country !== c.country) continue; const pn = norm(p.name); if (pn.length<6||k.length<6) continue; if (pn===k||pn.includes(k)||k.includes(pn)) {m=p; break} }
  if (m) console.log(`  dup: ${c.name} -> ${m.name} (${m.vegan_level})`)
  else newOnes.push(c)
}
console.log(`\nNew: ${newOnes.length}`)
const ccmap = { Spain:'es', Italy:'it', Greece:'gr' }
const payloads = newOnes.map(c => ({
  name: c.name, city: c.city, country: c.country,
  country_code: ccmap[c.country], category: 'eat', vegan_level: 'fully_vegan',
  description: c.note, address: `${c.city}, ${c.country}`,
  source: 'gap-cities-2026-05-15',
  source_id: `${c.country.toLowerCase()}-gap-${norm(c.name).replace(/\s+/g,'-')}`,
  tags: ['gap-cities-2026-05-15','multi-blog']
}))
writeFileSync('scripts/seo-out/coverage-boost-2026-05-15/gap-payloads.json', JSON.stringify(payloads, null, 2))

const log = 'scripts/seo-out/coverage-boost-2026-05-15/gap-import-results.jsonl'
writeFileSync(log, '')
let ok=0, fail=0
for (let i=0; i<payloads.length; i++) {
  const p = payloads[i]
  process.stdout.write(`[${i+1}/${payloads.length}] ${p.name} (${p.country}/${p.city}) ... `)
  const res = spawnSync('npx', ['tsx','scripts/add-place.ts','--imported','--force-vegan-level'], { input: JSON.stringify(p), encoding:'utf8', timeout: 90_000 })
  const out = (res.stdout||'') + (res.stderr||'')
  const inserted = /✓\s*Inserted|Public URL/i.test(out)
  appendFileSync(log, JSON.stringify({name:p.name,status:res.status,inserted,tail:out.split('\n').slice(-5).join(' / ').slice(0,400)}) + '\n')
  if (inserted){ok++; console.log('OK')} else {fail++; console.log('FAIL')}
}
console.log(`\nDone. ${ok} ok, ${fail} fail.`)
