// Read-only: find city labels that look like another label in the same country with the
// trailing "s" cut off (Worms -> Worm, Hohenems -> Hohenem). Also counts manual-2026-05-21 rows left.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const rows = []
let last = '00000000-0000-0000-0000-000000000000'
for (;;) {
  const { data, error } = await sb.from('places').select('id,city,country,source').is('archived_at', null).gt('id', last).order('id').limit(1000)
  if (error) throw error
  if (!data.length) break
  rows.push(...data); last = data[data.length - 1].id
}
const n = {}
for (const r of rows) if (r.city) { const k = r.country + '|' + r.city; n[k] = (n[k] || 0) + 1 }
const hits = Object.keys(n).filter(k => n[k + 's']).map(k => [k, n[k], n[k + 's']])
const src = {}
for (const r of rows) if (r.city && n[r.country + '|' + r.city + 's']) src[r.source] = (src[r.source] || 0) + 1
console.log('live rows', rows.length, '| truncated labels', hits.length, '| rows on them', hits.reduce((s, h) => s + h[1], 0))
console.log('by source', src)
console.log(hits.sort((a, b) => b[1] - a[1]).slice(0, 25).map(h => `${h[0]} (${h[1]}) vs +s (${h[2]})`).join('\n'))
console.log('manual-2026-05-21 live:', rows.filter(r => r.source === 'manual-2026-05-21').length)
