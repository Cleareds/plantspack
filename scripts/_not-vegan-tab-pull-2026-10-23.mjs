// Read-only: the /admin/data-quality?tab=not_vegan queue (live places carrying a
// community vegan-status tag) joined to their place_reports, for the 2026-10-23 pass.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const TAGS = ['not_fully_vegan', 'not_vegan_friendly', 'non_vegan_chain', 'vegan_friendly_chain', 'few_vegan_options', 'actually_fully_vegan'].map(t => `community_report:${t}`)
const places = new Map()
for (const t of TAGS) {
  const { data, error } = await sb.from('places').select('id, name, slug, city, country, address, category, vegan_level, website, verification_level, verification_method, is_verified, tags, admin_notes, review_count, created_by, source, updated_at').contains('tags', [t]).is('archived_at', null)
  if (error) throw error
  for (const p of data) places.set(p.id, p)
}
const ids = [...places.keys()]
const { data: reports } = ids.length ? await sb.from('place_reports').select('id, place_id, type, note, status, user_id, created_at').in('place_id', ids).order('created_at') : { data: [] }
const out = [...places.values()].map(p => ({ ...p, reports: reports.filter(r => r.place_id === p.id) }))
fs.writeFileSync('reports/dq-2026-10-23/not-vegan-queue.json', JSON.stringify(out, null, 1))
console.log('queue size:', out.length)
for (const p of out) {
  console.log(`\n### ${p.name} | ${p.city}, ${p.country} | ${p.category} | ${p.vegan_level} L${p.verification_level} ${p.verification_method} | reviews ${p.review_count} | ${p.website || '-'} | /place/${p.slug}`)
  console.log('   tags:', (p.tags || []).filter(t => t.startsWith('community_report') || t.includes('google')).join(', '))
  for (const r of p.reports) console.log(`   [${r.status}] ${r.created_at.slice(0, 10)} ${r.type} ${r.user_id ? 'U' : '-'}: ${(r.note || '').replace(/\s+/g, ' ').slice(0, 300)}`)
  if (p.admin_notes) console.log('   notes:', p.admin_notes.replace(/\s+/g, ' ').slice(-300))
}
