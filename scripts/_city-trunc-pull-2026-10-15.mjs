import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const rows = []
let last = '00000000-0000-0000-0000-000000000000'
for (;;) {
  const { data, error } = await sb.from('places').select('id,city,country,source,address,latitude,longitude,created_at').is('archived_at', null).gt('id', last).order('id').limit(1000)
  if (error) throw error
  if (!data.length) break
  rows.push(...data); last = data[data.length - 1].id
}
fs.writeFileSync(process.argv[2], JSON.stringify(rows))
const bySrc = {}
for (const r of rows) { if (!r.city) continue; const s = r.source || 'null'; bySrc[s] ||= { n: 0, s: 0 }; bySrc[s].n++; if (/s$/i.test(r.city)) bySrc[s].s++ }
console.log(Object.entries(bySrc).filter(([,v]) => v.n > 200).map(([k,v]) => `${k}: ${v.n} rows, ${(100*v.s/v.n).toFixed(1)}% end in s`).join('\n'))
