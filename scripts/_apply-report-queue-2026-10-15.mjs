// Data-quality 7 (2026-10-15): second pass on the pending human reports.
// Research: reports/dq-2026-10-15/reports-verdicts.json (read-only subagent, own menus first).
// Only medium/high evidence acts. Promotion to fully_vegan needs high, so Mordi e Faggi stays pending.
// Archive only import-account rows with no reviews. Dry-run unless --apply.
// Convention as 2026-10-01: verification_method tag, admin_notes line, community_report:* tags cleared.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const apply = process.argv.includes('--apply')
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const TODAY = '2026-10-15', VM = 'community-report-verified-2026-10-15'
const IMPORT_ACCOUNT = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

// name -> action. reportStatus defaults to 'reviewed'.
const ACTIONS = {
  'Mast Kalandar': { level: 'vegan_options', note: 'North Indian chain outlet serving veg and non-veg (EazyDiner).' },
  'Kushmeister': { level: 'vegan_friendly', note: 'Burger place with a separate vegan menu, also meat (spinach.guide).' },
  'Vegan Deli': { level: 'vegan_friendly', note: 'HappyCow: 1650 3rd Ave deli serves meat, with vegan options.' },
  'Pasta Davini': { level: 'vegan_options', note: 'Menu has beef cheeks and other meat dishes (Schlemmer Atlas).' },
  'MOMI': { level: 'vegan_options', note: 'Asian fusion with sushi/sashimi; reporter: own site shows a non-vegan menu.' },
  'Fundament': { level: 'vegan_options', note: 'Nose-to-tail restaurant: beef filet, tatar, veal (menu on carta.menu).' },
  "Jin's Haus Malatang": { level: 'vegan_options', hours: 'Tu-Su 11:30-21:45', note: 'Build-your-own malatang, beef-bone broth and meats on the counter.' },
  'zwei': { level: 'vegan_friendly', note: 'Own weekly menu Sep 2026: chicken breast wrap, salami focaccia.' },
  'Gate 57': { level: 'vegan_friendly', note: 'Separate vegan menu, also non-vegan dishes (spinach.guide, reporter).' },
  'Babalu': { level: 'vegan_options', hours: 'Tu-Th 18:30-00:30; Fr-Su 12:30-16:30,19:00-00:30', note: 'Own site: Mediterranean/Caribbean menu with honey ribs and paella; vegan on request.' },
  'Scoffs': { hours: 'Mo,Th-Su 10:00-15:00', note: 'Hours from Discover Leeds (closed Tue/Wed).' },
  'Bäristo Vegan Deli': { hours: 'Tu-Fr 12:00-14:00', note: 'Deli hours per reporter, consistent with Kiel-Magazin.' },
  'Nabäti Eatery': { note: 'Own site hours already match our data (Sunday 12:00-19:00).' },
  'THE BURGERZ Essen Frohnhausen': { note: 'Meat burger place; already at vegan_options, the weakest tier.' },
  'Plantiful': { reportStatus: 'dismissed', note: 'HappyCow: vegan except honey in some salads; mostly_vegan is right. No egg/yoghurt evidence found.' },
  'Best Imbiss': { reportStatus: 'dismissed', note: 'Single location (own eatbu site), not a chain.' },
  'DA NOI': { archive: 'no vegan food: own menu PDF has no vegan item (community report 2026-10-03, verified 2026-10-15)', note: 'Own menu PDF: every pizza has fior di latte, meat or fish; no vegan cheese.' },
  'Purpura Project': { archive: 'closed: HappyCow/Tripadvisor closed since Nov 2021 (community report 2026-10-14)', note: 'Closed Nov 2021 (HappyCow, Tripadvisor).' },
  'Odd Burger': { archive: 'closed: Broadview location never opened, unit for lease Jul 2025 (blogTO; community report 2026-10-14)', note: 'Never opened; blogTO Jul 2025.' },
}
// Everything else stays pending: low confidence (denns Bistro, Asia Dragon, Yapan sushi, Bar Angolo 40,
// Mai Garden), medium closure (Argentinian Vegan Grill), fully_vegan promotion at medium (Mordi e Faggi).

const verdicts = JSON.parse(fs.readFileSync('reports/dq-2026-10-15/reports-verdicts.json', 'utf8')).filter(v => !v.task)
const rollback = []
let changed = 0, reviewed = 0, held = 0
for (const v of verdicts) {
  const a = ACTIONS[v.name]
  if (!a) { held++; console.log(`${v.name.padEnd(32)} stays pending`); continue }
  const { data: p, error } = await sb.from('places').select('id,name,vegan_level,verification_method,tags,admin_notes,opening_hours,archived_at,created_by,review_count').eq('id', v.place_id).single()
  if (error || !p || p.archived_at) { console.log('skip', v.name); continue }
  if (a.archive && (p.created_by !== IMPORT_ACCOUNT || (p.review_count || 0) > 0)) { held++; console.log(`${v.name.padEnd(32)} HOLD: protected row, not archived`); continue }
  const status = a.reportStatus ?? 'reviewed'
  const patch = { admin_notes: `${p.admin_notes ? p.admin_notes.trimEnd() + '\n' : ''}[community-report-resolved ${TODAY} (${v.type})] ${a.note}` }
  if (a.level && a.level !== p.vegan_level) { patch.vegan_level = a.level; patch.verification_method = VM }
  if (a.hours) patch.opening_hours = a.hours
  if (a.archive) { patch.archived_at = new Date().toISOString(); patch.archived_reason = a.archive }
  patch.tags = (p.tags || []).filter(t => !String(t).startsWith('community_report:'))
  console.log(`${v.name.padEnd(32)} ${p.vegan_level} -> ${patch.vegan_level ?? '='}${a.archive ? ' ARCHIVE' : ''}${a.hours ? ' hours' : ''} | report -> ${status}`)
  if (!apply) continue
  rollback.push(p)
  const { error: e1 } = await sb.from('places').update(patch).eq('id', p.id)
  if (e1) { console.log('  ERROR', e1.message); continue }
  changed++
  const { error: e2 } = await sb.from('place_reports').update({ status }).eq('id', v.report_id)
  if (e2) console.log('  ERROR report', e2.message); else reviewed++
  try { await fetch('https://www.plantspack.com/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.REVALIDATE_SECRET}` }, body: JSON.stringify({ place_id: p.id }) }) } catch {}
}
// The 5 reports whose place is already archived: close them.
const pend = JSON.parse(fs.readFileSync('reports/reports-queue/pending-2026-10-15.json', 'utf8')).filter(r => r.place?.archived_at)
if (apply && pend.length) await sb.from('place_reports').update({ status: 'reviewed' }).in('id', pend.map(r => r.id))
if (apply) fs.writeFileSync('reports/dq-2026-10-15/rollback-reports.json', JSON.stringify(rollback, null, 1))
console.log(`\napply=${apply}: places updated ${changed}, reports closed ${reviewed} (+${pend.length} on archived places), pending ${held}`)
