// Follow-up to the 2026-10-28 Ukraine audit, on the user's decisions:
//   1. archive the pizza chains Celentano (Nikopol) and Pizza Letta (Lviv) - chain policy
//   2. Crimea: no fully/mostly vegan place there, so every live Crimea row is archived
//      (two link to .ru sites); website cleared on the .ru rows
//   3. Vegetus shops, Smak Zhyttya, Roslynka: unverifiable by script -> Research Review queue
// Dry-run by default; --apply writes. Rollback: reports/ukraine-audit/rollback-followup-2026-10-28.json
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const TAG = 'ukraine-audit-2026-10-28'
const ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: all, error } = await sb.from('places').select('id,name,city,vegan_level,website,latitude,longitude,archived_at,archived_reason').eq('country', 'Ukraine').is('archived_at', null)
if (error) throw error
const inCrimea = p => p.latitude > 44.3 && p.latitude < 46.3 && p.longitude > 32.4 && p.longitude < 36.7 && !(p.latitude > 46.0 && p.longitude < 34.0)
const archive = []
for (const id of ['e50bdf6f-d79b-4f10-8bbf-0dcdb727de4a', '8ed09b6a-8708-4c0a-9c10-ba14ac4abc78']) {
  const p = all.find(x => x.id === id); if (p) archive.push({ p, upd: { archived_reason: 'chain-restaurant-policy' } })
}
for (const p of all.filter(inCrimea)) {
  if (['fully_vegan', 'mostly_vegan'].includes(p.vegan_level)) continue
  const upd = { archived_reason: `${TAG}: Crimea, not fully/mostly vegan${/\.ru(\/|$)/i.test(p.website || '') ? ', .ru website' : ''}` }
  if (/\.ru(\/|$)/i.test(p.website || '')) upd.website = null
  archive.push({ p, upd })
}
const review = all.filter(p => /vegetus/i.test(p.name) || ['ec65f0f1-4cd5-43ab-b2b0-69e7ce2e143b', 'aff247bd-fb4d-460c-81c9-bd3be8b6ab63'].includes(p.id))
const NOTES = {
  'ec65f0f1-4cd5-43ab-b2b0-69e7ce2e143b': 'Official site blocks checks (429). Confirm hours/phone; one source puts the Zelena 19 shop in Uzhhorod, not Lviv.',
  'aff247bd-fb4d-460c-81c9-bd3be8b6ab63': 'Operation unclear: Restaurant Guru (Jun 2026) says temporarily closed; owner said "unstable". Two addresses (Danyla Halytskoho 33 vs Kovelska 1). Audit suggests fully_vegan, only a Dec 2024 article calls it vegan.',
}
const corrections = review.map(p => ({
  place_id: p.id, user_id: ADMIN, status: 'pending',
  note: `CLI-REVIEW ${TAG}: ${NOTES[p.id] || 'Vegetus store locators return 403 to scripts. Confirm this branch exists at this address, its hours and phone, and its vegan level (health-food chain, not all stock vegan).'}`.slice(0, 1000),
  corrections: { proposed_action: /vegetus/i.test(p.name) ? 'ukraine_verify_vegetus_branch' : 'ukraine_verify_manually', source: TAG },
}))
for (const a of archive) console.log(`ARCHIVE ${a.p.name} (${a.p.city}, ${a.p.vegan_level}) ${JSON.stringify(a.upd)}`)
for (const c of corrections) console.log(`REVIEW ${review.find(p => p.id === c.place_id).name} (${review.find(p => p.id === c.place_id).city})`)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('reports/ukraine-audit/rollback-followup-2026-10-28.json', JSON.stringify(archive.map(a => a.p), null, 1))
const now = new Date().toISOString()
for (const a of archive) { const r = await sb.from('places').update({ archived_at: now, ...a.upd }).eq('id', a.p.id); if (r.error) throw r.error }
const r = await sb.from('place_corrections').insert(corrections); if (r.error) throw r.error
console.log(`archived ${archive.length}, queued ${corrections.length}`)
