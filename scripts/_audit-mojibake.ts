// Audit how widespread UTF-8 mojibake is across places.
// Patterns like "AlmacÃ©n" come from Latin-1 -> UTF-8 mis-decoding during import.
// "Ã©" should be "é", "Ã±" should be "ñ", etc.

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

// The bytes that signal mojibake. If we see Ã (0xC3) in any text, it is almost
// always the high byte of a UTF-8 sequence that was double-decoded.
const SIG = /Ã[\x80-\xBF]|Â[\x80-\xBF]/

const FIELDS = ['name', 'description', 'address', 'city'] as const

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // We need to scan the whole table. Use cursor pagination by id.
  let cursor: string | null = null
  const totals = { rows: 0, dirty: 0, perField: { name: 0, description: 0, address: 0, city: 0 } as Record<string, number> }
  const sample: Array<{ id: string, field: string, value: string }> = []
  const dirtyBySource = new Map<string, number>()

  for (;;) {
    let q = sb.from('places').select('id, name, description, address, city, source').order('id', { ascending: true }).limit(1000)
    if (cursor) q = q.gt('id', cursor)
    const { data, error } = await q
    if (error) { console.error(error); process.exit(1) }
    if (!data || data.length === 0) break
    for (const r of data) {
      totals.rows++
      let rowDirty = false
      for (const f of FIELDS) {
        const v: string | null = (r as any)[f]
        if (v && SIG.test(v)) {
          rowDirty = true
          totals.perField[f]++
          if (sample.length < 12) sample.push({ id: r.id, field: f, value: v.slice(0, 120) })
        }
      }
      if (rowDirty) {
        totals.dirty++
        dirtyBySource.set(r.source ?? 'NULL', (dirtyBySource.get(r.source ?? 'NULL') ?? 0) + 1)
      }
    }
    cursor = data[data.length - 1].id
    if (data.length < 1000) break
  }

  console.log(`Scanned: ${totals.rows} rows`)
  console.log(`Dirty rows (any field): ${totals.dirty}`)
  console.log(`Per-field dirty counts:`, totals.perField)
  console.log('\nDirty rows by source:')
  for (const [k, v] of [...dirtyBySource.entries()].sort((a,b)=>b[1]-a[1])) console.log(`  ${v.toString().padStart(5)}  ${k}`)
  console.log('\nSample dirty values:')
  for (const s of sample) console.log(`  [${s.field}]  ${s.value}`)
}
main()
