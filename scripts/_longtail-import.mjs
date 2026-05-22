import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const payloads = JSON.parse(readFileSync('scripts/seo-out/longtail-overnight-2026-05-16/payloads.json','utf8'))
const log = 'scripts/seo-out/longtail-overnight-2026-05-16/import-results.jsonl'
writeFileSync(log, '')
let ok=0, fail=0
for (let i = 0; i < payloads.length; i++) {
  const p = payloads[i]
  process.stdout.write(`[${i+1}/${payloads.length}] ${p.name} (${p.country}/${p.city}) ... `)
  const res = spawnSync('npx', ['tsx', 'scripts/add-place.ts', '--imported', '--force-vegan-level'], { input: JSON.stringify(p), encoding: 'utf8', timeout: 90_000 })
  const out = (res.stdout||'') + (res.stderr||'')
  const inserted = /✓\s*Inserted|Public URL/i.test(out)
  appendFileSync(log, JSON.stringify({ name: p.name, country: p.country, city: p.city, status: res.status, inserted, tail: out.split('\n').slice(-5).join(' / ').slice(0,400) }) + '\n')
  if (inserted) { ok++; console.log('OK') } else { fail++; console.log('FAIL') }
}
console.log(`\nDone. ${ok} ok, ${fail} fail.`)
