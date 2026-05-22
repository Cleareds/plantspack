import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const payloads = JSON.parse(readFileSync('scripts/seo-out/berlin-import-2026-05-15/payloads.json','utf8'))
const logPath = 'scripts/seo-out/berlin-import-2026-05-15/import-results.jsonl'
writeFileSync(logPath, '')
let ok = 0, fail = 0
for (let i = 0; i < payloads.length; i++) {
  const p = payloads[i]
  process.stdout.write(`[${i+1}/${payloads.length}] ${p.name} (${p.vegan_level}) ... `)
  const res = spawnSync('npx', ['tsx', 'scripts/add-place.ts', '--imported'], {
    input: JSON.stringify(p),
    encoding: 'utf8',
    timeout: 90_000,
  })
  const out = (res.stdout || '') + (res.stderr || '')
  const inserted = /inserted|created place|✓ inserted|✅/i.test(out) || /id:\s*[a-f0-9-]{36}/i.test(out)
  const status = res.status
  appendFileSync(logPath, JSON.stringify({ name: p.name, status, inserted, tail: out.split('\n').slice(-8).join(' / ').slice(0, 400) }) + '\n')
  if (status === 0) { ok++; console.log('OK') } else { fail++; console.log(`FAIL (exit ${status})`) }
}
console.log(`\nDone. ${ok} ok, ${fail} fail.`)
