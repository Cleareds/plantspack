import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const payloads = JSON.parse(readFileSync('scripts/seo-out/berlin-import-2026-05-15/payloads.json','utf8'))
const prev = readFileSync('scripts/seo-out/berlin-import-2026-05-15/import-results.jsonl','utf8')
  .trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
const succeeded = new Set(prev.filter(r => r.inserted).map(r => r.name))
const toRetry = payloads.filter(p => !succeeded.has(p.name))
console.log(`Retrying ${toRetry.length} failed inserts (skipping ${succeeded.size} already done)`)
const logPath = 'scripts/seo-out/berlin-import-2026-05-15/import-results-retry.jsonl'
writeFileSync(logPath, '')
let ok=0, fail=0
for (let i = 0; i < toRetry.length; i++) {
  const p = toRetry[i]
  process.stdout.write(`[${i+1}/${toRetry.length}] ${p.name} (${p.vegan_level}) ... `)
  const res = spawnSync('npx', ['tsx', 'scripts/add-place.ts', '--imported', '--force-vegan-level'], {
    input: JSON.stringify(p),
    encoding: 'utf8',
    timeout: 90_000,
  })
  const out = (res.stdout || '') + (res.stderr || '')
  const inserted = /✓\s*Inserted|Public URL/i.test(out)
  appendFileSync(logPath, JSON.stringify({ name: p.name, status: res.status, inserted, tail: out.split('\n').slice(-6).join(' / ').slice(0, 400) }) + '\n')
  if (inserted) { ok++; console.log('OK') } else { fail++; console.log(`FAIL`) }
}
console.log(`\nRetry done. ${ok} ok, ${fail} fail.`)
