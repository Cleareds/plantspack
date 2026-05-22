import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'node:fs'
dotenv.config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const root = 'scripts/seo-out/major-cities-sweep-2026-05-16'
const candidates = JSON.parse(fs.readFileSync(`${root}/candidates.json`))

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

async function fetchAll(country) {
  const rows = []
  let from = 0
  while (true) {
    const { data } = await sb.from('places').select('id,name,city,vegan_level').eq('country', country).is('archived_at', null).range(from, from + 999)
    if (!data?.length) break
    rows.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  return rows
}

const spain = await fetchAll('Spain')
const italy = await fetchAll('Italy')
const byCountry = { Spain: spain, Italy: italy }

const order = { vegan_options: 1, vegan_friendly: 2, mostly_vegan: 3, fully_vegan: 4 }
const payloads = []
const promotions = []
const skipped = []

for (const c of candidates) {
  const db = byCountry[c.country].filter(r => norm(r.city) === norm(c.city))
  const cname = norm(c.name)
  const cnameStripped = cname.replace(/\b(restaurant|cafe|bistro|bistrot|bar|bakery|barcelona|madrid|valencia|rome|milan|florence|firenze)\b/g, '').trim()
  const match = db.find(r => {
    const rn = norm(r.name)
    if (rn === cname) return true
    if (cnameStripped.length >= 5 && (rn.includes(cnameStripped) || cnameStripped.includes(rn))) return true
    return false
  })
  if (match) {
    if (order[c.vegan_level] > order[match.vegan_level]) {
      promotions.push({ id: match.id, name: match.name, from: match.vegan_level, to: c.vegan_level })
    } else {
      skipped.push({ name: c.name, city: c.city, db_name: match.name, db_level: match.vegan_level })
    }
  } else {
    payloads.push({
      name: c.name,
      city: c.city,
      country: c.country,
      country_code: c.country === 'Spain' ? 'es' : 'it',
      category: 'eat',
      vegan_level: c.vegan_level,
      address: `${c.city}, ${c.country}`,
      description: c.notes,
      tags: ['user_recommended']
    })
  }
}

fs.writeFileSync(`${root}/payloads.json`, JSON.stringify(payloads, null, 2))
fs.writeFileSync(`${root}/promotions.json`, JSON.stringify(promotions, null, 2))
fs.writeFileSync(`${root}/skipped.json`, JSON.stringify(skipped, null, 2))
console.log(`Sweep: ${payloads.length} new, ${promotions.length} promotions, ${skipped.length} skipped (already at-or-above)`)
console.log('\nSkipped (already covered):')
skipped.forEach(s => console.log(`  ${s.name} → ${s.db_name} (${s.db_level})`))
console.log('\nPromotions:')
promotions.forEach(p => console.log(`  ${p.name}: ${p.from} → ${p.to}`))
