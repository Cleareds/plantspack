// Apply a JSON map of { id: description } to places.description.
// JSON shape:
//   { "uuid-1": "...description...", "uuid-2": "...", ... }
// Usage:
//   cat descriptions.json | npx tsx scripts/_apply-descriptions.ts
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

async function main() {
  const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a: any, l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) a[m[1]] = m[2].replace(/^["']|["']$/g, ''); return a
  }, {})
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const stdin = readFileSync(0, 'utf8')
  const map = JSON.parse(stdin) as Record<string, string>
  const ids = Object.keys(map)
  console.log(`Applying ${ids.length} descriptions...`)

  let ok = 0, fail = 0
  const writes = []
  const now = new Date().toISOString()
  for (const id of ids) {
    const desc = (map[id] || '').trim()
    if (!desc || desc.length < 30) { fail++; continue }
    writes.push(sb.from('places').update({ description: desc, updated_at: now }).eq('id', id).then((r: any) => {
      if (r.error) { console.error(`  ${id}: ${r.error.message}`); fail++ } else ok++
    }))
  }
  await Promise.all(writes)
  console.log(`Done: ${ok} ok, ${fail} fail`)
}
main().catch(e => { console.error(e); process.exit(1) })
