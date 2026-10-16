// Build chunks for the automated label check (2026-10-14).
// Input: reports/label-check/remaining.json minus every row that already has a
// verdict in reports/label-check/verdict-*.json or auto/out/*.json (except
// verdict "unchecked", which is re-queued). Rows are sorted by country so one
// agent works one region. Writes auto/chunks/<prefix>NN.json, 60 rows each.
//   node scripts/_label-check-auto-prep.mjs            # first build, prefix c
//   node scripts/_label-check-auto-prep.mjs --requeue  # only unchecked rows, prefix r<timestamp>
import fs from 'node:fs'
const D = 'reports/label-check/'
const A = D + 'auto/'
const SIZE = 60
const REQUEUE = process.argv.includes('--requeue')
for (const d of ['chunks', 'out', 'applied']) fs.mkdirSync(A + d, { recursive: true })

const readArr = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return [] } }
const verdictFiles = [
  ...fs.readdirSync(D).filter(f => /^verdict-.*\.json$/.test(f)).map(f => D + f),
  ...fs.readdirSync(A + 'out').filter(f => f.endsWith('.json')).map(f => A + 'out/' + f),
]
const done = new Set(), unchecked = new Set()
for (const f of verdictFiles) for (const v of readArr(f)) {
  if (v.verdict === 'unchecked') unchecked.add(v.id); else done.add(v.id)
}
const chunkFiles = fs.readdirSync(A + 'chunks').filter(f => f.endsWith('.json'))
const queued = new Set(chunkFiles.flatMap(f => readArr(A + 'chunks/' + f)).map(r => r.id))
// A row in a chunk that has no output yet is still pending: never queue it twice.
const pending = new Set(chunkFiles.filter(f => !fs.existsSync(A + 'out/' + f))
  .flatMap(f => readArr(A + 'chunks/' + f)).map(r => r.id))

const rem = readArr(D + 'remaining.json')
const rows = REQUEUE
  ? rem.filter(r => unchecked.has(r.id) && !done.has(r.id) && !pending.has(r.id))
  : rem.filter(r => !done.has(r.id) && !queued.has(r.id))

if (!rows.length) { console.log('nothing to queue'); process.exit(0) }
rows.sort((a, b) => (a.country || '').localeCompare(b.country || '') || (a.city || '').localeCompare(b.city || ''))
const prefix = REQUEUE ? `r${Date.now().toString(36)}-` : 'c'
let n = 0
for (let i = 0; i < rows.length; i += SIZE) {
  const name = `${prefix}${String(++n).padStart(2, '0')}`
  fs.writeFileSync(`${A}chunks/${name}.json`, JSON.stringify(rows.slice(i, i + SIZE), null, 1))
}
console.log(`${REQUEUE ? 'requeued' : 'queued'} ${rows.length} rows in ${n} chunks`)
