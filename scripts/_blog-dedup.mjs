import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, writeFileSync } from 'node:fs'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const candidates = JSON.parse(readFileSync('scripts/seo-out/coverage-boost-2026-05-15/blog-candidates.json','utf8'))

function norm(s) { return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim() }
const dbAll = []
for (const country of ['Croatia','Portugal','Turkey']) {
  let from = 0
  while (true) {
    const { data } = await sb.from('places').select('id,name,city,country,vegan_level').eq('country', country).is('archived_at',null).order('id').range(from, from+999)
    if (!data?.length) break
    dbAll.push(...data); if (data.length < 1000) break; from += 1000
  }
}
const dbByNorm = new Map(dbAll.map(p => [norm(p.name), p]))
const newOnes = []
for (const c of candidates) {
  const k = norm(c.name)
  let m = dbByNorm.get(k)
  if (!m) {
    for (const p of dbAll) {
      if (p.country !== c.country) continue
      const pn = norm(p.name)
      if (pn.length < 6 || k.length < 6) continue
      if (pn === k || pn.includes(k) || k.includes(pn)) { m = p; break }
    }
  }
  if (m) console.log(`  dup: ${c.name} (${c.country}) -> ${m.name} (level ${m.vegan_level})`)
  else newOnes.push(c)
}
console.log(`\nNew (not in DB): ${newOnes.length}`)
writeFileSync('scripts/seo-out/coverage-boost-2026-05-15/blog-new.json', JSON.stringify(newOnes, null, 2))

// Build payloads
const payloads = newOnes.map(c => ({
  name: c.name,
  city: c.city,
  country: c.country,
  country_code: c.country === 'Croatia' ? 'hr' : c.country === 'Portugal' ? 'pt' : 'tr',
  category: 'eat',
  vegan_level: c.level,
  description: c.note,
  address: `${c.city}, ${c.country}`,
  source: 'blog-coverage-2026-05-15',
  source_id: `${c.country.toLowerCase()}-blog-${norm(c.name).replace(/\s+/g,'-')}`,
  tags: ['blog-coverage-2026-05-15'],
}))
writeFileSync('scripts/seo-out/coverage-boost-2026-05-15/blog-payloads.json', JSON.stringify(payloads, null, 2))
console.log(`Payloads: ${payloads.length}`)
