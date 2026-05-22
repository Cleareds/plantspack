import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const root = 'scripts/seo-out/bcn-round2-2026-05-16'
const candidates = JSON.parse(fs.readFileSync(`${root}/candidates.json`))

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

const ours = []
let from = 0
while (true) {
  const { data } = await sb.from('places').select('id,name,vegan_level').eq('country', 'Spain').eq('city', 'Barcelona').is('archived_at', null).range(from, from + 999)
  if (!data?.length) break
  ours.push(...data); if (data.length < 1000) break; from += 1000
}

const toImport = []
const skipped = []
for (const c of candidates) {
  const cn = norm(c.name)
  const cnStrip = cn.replace(/\bbarcelona\b|\bvegan\b/g, '').trim()
  const hit = ours.find(r => {
    const rn = norm(r.name)
    if (rn === cn) return true
    if (cnStrip.length >= 5 && (rn.includes(cnStrip) || cnStrip.includes(rn))) return true
    return false
  })
  if (hit) skipped.push({ c: c.name, db: hit.name, l: hit.vegan_level })
  else toImport.push(c)
}
console.log(`Skipped (in DB): ${skipped.length}`)
skipped.forEach(s => console.log(`  ${s.c} → ${s.db} (${s.l})`))
console.log(`\nTo import: ${toImport.length}`)

fs.writeFileSync(`${root}/import-results.jsonl`, '')
let ok = 0, fail = 0
for (let i = 0; i < toImport.length; i++) {
  const c = toImport[i]
  const payload = {
    name: c.name,
    city: 'Barcelona',
    country: 'Spain',
    country_code: 'es',
    category: 'eat',
    vegan_level: c.vegan_level,
    address: c.address,
    description: c.notes,
    tags: ['bcn_round2_2026_05']
  }
  process.stdout.write(`  [${i + 1}/${toImport.length}] ${c.name.padEnd(40)} `)
  const r = await new Promise(resolve => {
    const child = spawn('npx', ['tsx', 'scripts/add-place.ts', '--imported', '--force-vegan-level'], { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', d => { out += d })
    child.stderr.on('data', () => {})
    child.stdin.write(JSON.stringify(payload))
    child.stdin.end()
    const timer = setTimeout(() => { child.kill('SIGTERM'); resolve({ ok: false }) }, 60000)
    child.on('exit', code => {
      clearTimeout(timer)
      const ok = /Public URL/.test(out) && code === 0
      const url = out.match(/Public URL:\s*(\S+)/)?.[1]
      resolve({ ok, url })
    })
  })
  if (r.ok) { ok++; console.log(`✓ ${r.url}`) } else { fail++; console.log('✗') }
  fs.appendFileSync(`${root}/import-results.jsonl`, JSON.stringify({ ...c, ...r }) + '\n')
}
console.log(`\nDone. ${ok} ok, ${fail} failed`)
