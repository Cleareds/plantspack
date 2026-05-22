import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const root = 'scripts/seo-out/major-cities-sweep-2026-05-16'
const payloads = JSON.parse(fs.readFileSync(`${root}/payloads.json`))
const promotions = JSON.parse(fs.readFileSync(`${root}/promotions.json`))

// 1) Apply promotions
console.log(`\n=== Applying ${promotions.length} promotions ===`)
for (const p of promotions) {
  const { error } = await sb.from('places').update({
    vegan_level: p.to,
    verification_method: 'major-cities-sweep-2026-05-16',
    last_verified_at: new Date().toISOString()
  }).eq('id', p.id)
  console.log(`  ${error ? '✗' : '✓'} ${p.name}: ${p.from} → ${p.to}`)
}

// 2) Run add-place per new
console.log(`\n=== Importing ${payloads.length} new places ===`)
const log = `${root}/import-results.jsonl`
fs.writeFileSync(log, '')
for (const [i, p] of payloads.entries()) {
  console.log(`\n[${i + 1}/${payloads.length}] ${p.name} — ${p.city}, ${p.country}`)
  const result = await new Promise(resolve => {
    const c = spawn('npx', ['tsx', 'scripts/add-place.ts', '--imported', '--force-vegan-level'], { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = '', err = ''
    c.stdout.on('data', d => { out += d; process.stdout.write(d) })
    c.stderr.on('data', d => { err += d; process.stderr.write(d) })
    c.stdin.write(JSON.stringify(p))
    c.stdin.end()
    const timer = setTimeout(() => { c.kill('SIGTERM'); resolve({ ok: false, reason: 'timeout', out, err }) }, 90000)
    c.on('exit', code => {
      clearTimeout(timer)
      const ok = /✓\s*Inserted|Public URL/i.test(out) && code === 0
      resolve({ ok, code, out, err })
    })
  })
  fs.appendFileSync(log, JSON.stringify({ name: p.name, city: p.city, country: p.country, ok: result.ok }) + '\n')
}
console.log('\nDone.')
