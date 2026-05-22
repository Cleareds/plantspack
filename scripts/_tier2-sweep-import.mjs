import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const root = process.argv[2] || 'scripts/seo-out/tier2-sweep-2026-05-16'
const tagName = process.argv[3] || 'tier2_2026_05'
const candidates = JSON.parse(fs.readFileSync(`${root}/candidates.json`))

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
const codeFor = (c) => ({ Spain: 'es', Italy: 'it', Germany: 'de', Croatia: 'hr', Greece: 'gr', Turkey: 'tr', Portugal: 'pt', France: 'fr', Cyprus: 'cy', Malta: 'mt', Slovenia: 'si', Montenegro: 'me', Albania: 'al', Bulgaria: 'bg', Brazil: 'br', Mexico: 'mx', Argentina: 'ar', Chile: 'cl' })[c] || 'us'

// Build per-country/city dedup lookup
const cache = new Map()
async function fetchOurs(country, city) {
  const k = `${country}|${city}`
  if (cache.has(k)) return cache.get(k)
  const rows = []
  let from = 0
  while (true) {
    const { data } = await sb.from('places').select('id,name,vegan_level').eq('country', country).eq('city', city).is('archived_at', null).range(from, from + 999)
    if (!data?.length) break
    rows.push(...data); if (data.length < 1000) break; from += 1000
  }
  cache.set(k, rows)
  return rows
}

const skipped = []
const promotions = []
const toImport = []
const order = { vegan_options: 1, vegan_friendly: 2, mostly_vegan: 3, fully_vegan: 4 }
for (const c of candidates) {
  const ours = await fetchOurs(c.country, c.city)
  const cn = norm(c.name)
  const cnStrip = cn.replace(new RegExp(`\\b${c.city.toLowerCase()}\\b|\\bvegan\\b`, 'g'), '').trim()
  const hit = ours.find(r => {
    const rn = norm(r.name)
    if (rn === cn) return true
    if (cnStrip.length >= 5 && (rn.includes(cnStrip) || cnStrip.includes(rn))) return true
    return false
  })
  if (hit) {
    if (order[c.vegan_level] > order[hit.vegan_level]) {
      promotions.push({ id: hit.id, name: hit.name, city: c.city, country: c.country, from: hit.vegan_level, to: c.vegan_level })
    } else {
      skipped.push({ c: c.name, db: hit.name, city: c.city, l: hit.vegan_level })
    }
  } else {
    toImport.push(c)
  }
}
console.log(`Skipped in DB: ${skipped.length}`)
skipped.forEach(s => console.log(`  [${s.city}] ${s.c} → ${s.db} (${s.l})`))
console.log(`\nPromotions: ${promotions.length}`)
promotions.forEach(p => console.log(`  [${p.city}] ${p.name}: ${p.from} → ${p.to}`))
console.log(`\nTo import: ${toImport.length}\n`)

// Apply promotions
for (const p of promotions) {
  await sb.from('places').update({
    vegan_level: p.to,
    verification_method: tagName,
    last_verified_at: new Date().toISOString()
  }).eq('id', p.id)
}

// Run imports
const log = `${root}/import-results.jsonl`
fs.writeFileSync(log, '')
let ok = 0, fail = 0
for (let i = 0; i < toImport.length; i++) {
  const c = toImport[i]
  const payload = {
    name: c.name,
    city: c.city,
    country: c.country,
    country_code: codeFor(c.country),
    category: 'eat',
    vegan_level: c.vegan_level,
    address: c.address,
    description: c.notes,
    tags: [tagName]
  }
  process.stdout.write(`  [${i + 1}/${toImport.length}] ${c.city.padEnd(20)} ${c.name.slice(0, 35).padEnd(35)} `)
  const r = await new Promise(resolve => {
    const child = spawn('npx', ['tsx', 'scripts/add-place.ts', '--imported', '--force-vegan-level'], { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    child.stderr.on('data', () => {})
    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
    const timer = setTimeout(() => { child.kill('SIGTERM'); resolve({ ok: false, reason: 'timeout' }) }, 60000)
    child.on('exit', code => {
      clearTimeout(timer)
      const ok = /Public URL/.test(out) && code === 0
      const url = out.match(/Public URL:\s*(\S+)/)?.[1]
      resolve({ ok, url })
    })
  })
  if (r.ok) { ok++; console.log(`✓`) } else { fail++; console.log('✗') }
  fs.appendFileSync(log, JSON.stringify({ ...c, ...r }) + '\n')
}
console.log(`\nDone. ${ok} ok, ${fail} failed`)
