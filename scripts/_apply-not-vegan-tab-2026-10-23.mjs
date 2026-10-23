// Data-quality 2026-10-23: the /admin/data-quality?tab=not_vegan queue (8 reports, all filed 2026-10-23).
// Research in-session (own sites first, then HappyCow / Michelin / Spinach Guide). Dry-run unless --apply.
// Convention as 2026-10-01/10-15: verification_method tag, admin_notes line, community_report:* tags cleared,
// reporters notified like the admin UI does. is_verified is never touched (El Verde's human admin_review stays;
// its demotion is queued for a human click instead).
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const apply = process.argv.includes('--apply')
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const TODAY = '2026-10-23', VM = 'community-report-verified-2026-10-23'

// slug -> action. report: 'reviewed' (listing changed) | 'dismissed' (kept). msg = reporter notification.
const ACTIONS = {
  'kobe-luxembourg': {
    report: 'reviewed', level: 'vegan_options', address: "4 Rue de l'Eau, 1449 Luxembourg",
    description: 'Japanese sushi restaurant in Luxembourg City (Ville-Haute) serving sushi, sashimi and bowls with raw fish. A few vegan options, such as a vegetable poke bowl.',
    note: 'Reporter: full sushi restaurant with fish. Mapstr/Wanderlog/Rankeat: sushi and sashimi, some vegan options. Old text claimed "mostly vegan".',
    msg: name => `Thanks! We checked your report on ${name}: it is a sushi restaurant that serves fish. We changed it to "vegan options" and fixed the description.`,
  },
  'de-nieuwe-winkel-nijmegen': {
    report: 'reviewed', level: 'fully_vegan', vlevel: 3, addTags: ['websearch_confirmed_vegan'],
    note: 'HappyCow: Vegan, "reported fully vegan December 2022" (updated Aug 2026); Michelin cuisine tag "Organic, Vegan"; Chowhound "two-Michelin-starred vegan restaurant".',
  },
  'glow-luxembourg': {
    report: 'reviewed', level: 'fully_vegan', vlevel: 2, addTags: ['websearch_confirmed_vegan'],
    description: 'Vegan cafe in Bonnevoie, Luxembourg City: coffee, juices, homemade cakes and pastries, soups, sandwiches, bowls and curries.',
    note: 'HappyCow: Vegan, "reported fully vegan February 2022"; 2025-2026 reviews: "Komplett veganes Cafe". Own site does not say 100% vegan, so L2.',
    msg: name => `Thanks! We checked your report and ${name} is now listed as 100% vegan.`,
  },
  'konijnenvoer-arnhem': {
    report: 'dismissed',
    description: 'Tasting-menu restaurant in Arnhem with Italian-inspired dishes made in-house (breads, pasta, desserts). Since July 2026 the kitchen uses eggs and honey; the owner describes it as vegetarian, not vegan. A fully plant-based menu is still offered on request. Listed in the Michelin Guide with a Green Star.',
    note: 'HappyCow (Sep 2026): previously vegan, serves eggs and honey since July 2026, owner reply "Vegetarisch, niet vegan"; relocated from Weverstraat 40 (new address not confirmed, address kept). vegan_friendly is right.',
    msg: name => `Thanks for your report on ${name}. Since July 2026 the kitchen uses eggs and honey (the owner calls it vegetarian, not vegan), so we keep it as "vegan friendly". A fully plant-based menu is still offered on request.`,
  },
  'foglia-genk': {
    report: 'reviewed', level: 'fully_vegan', vlevel: 2, addTags: ['websearch_confirmed_vegan'],
    description: 'Vegan takeaway in Genk with Italian-inspired plant-based meals, freshly made pastries and coffee to go.',
    note: 'HappyCow: Vegan takeaway (reported closed Sep 2025, reopened Feb 2026); En Primeur Club: 100% plant-based menu. Only Facebook, so L2.',
    msg: name => `Thanks! We checked your report and ${name} is now listed as 100% vegan.`,
  },
  'el-verde-genk': {
    report: 'dismissed',
    description: 'Breakfast and brunch cafe in Genk with a vegetarian menu built on local, seasonal produce. Several dishes are vegan; ask staff about ingredients.',
    note: 'Not fully vegan: HappyCow Veg-options (Ovo tag), Spinach Guide "vegetarian, limited vegan options". Old text said "Vegan breakfast bar". Level left as set by admin_review; demotion to vegan_friendly queued for a human.',
    queue: { proposed_action: 'review_vegan_level_downgrade', from: 'mostly_vegan', to: 'vegan_friendly', reason: 'HappyCow lists El Verde as Veg-options with an Ovo tag; Spinach Guide classifies it vegetarian with limited vegan options. Reporter claimed fully vegan; evidence says the opposite.' },
    msg: name => `Thanks for your report on ${name}. Sources show it is a vegetarian cafe that also serves eggs, so we cannot list it as 100% vegan.`,
  },
  'vangroenten-hasselt': {
    report: 'reviewed', level: 'vegan_friendly',
    note: 'Own site: "vegetarisch, indien gewenst veganistisch" (vegetarian, vegan if desired). Not fully vegan; mostly_vegan overstated it.',
    msg: name => `Thanks for your report on ${name}. Its own website says the food is vegetarian and vegan on request, so we cannot list it as 100% vegan. We changed it to "vegan friendly".`,
  },
  'leeloo-bvba-bruges': {
    report: 'reviewed', level: 'fully_vegan', vlevel: 3, addTags: ['websearch_confirmed_vegan'],
    name: 'Leeloo', category: 'store', subcategory: 'clothing', website: 'https://www.leeloo.be', address: 'Sint-Jakobsstraat 19, 8000 Brugge',
    description: 'Vegan clothing and accessories shop in central Bruges: T-shirts, sweaters, trousers, socks, bags and some body-care products. No wool, leather, fur, down or silk.',
    note: 'Own site leeloo.be: "We love animals, so we\'re a vegan shop", no animal-derived materials. HappyCow: all-vegan clothing shop. Was miscategorised as a cafe with an AI description.',
  },
}

const queue = JSON.parse(fs.readFileSync('reports/dq-2026-10-23/not-vegan-queue.json', 'utf8'))
const rollback = []
for (const q of queue) {
  const a = ACTIONS[q.slug]
  if (!a) { console.log(`${q.name.padEnd(20)} no action, stays`); continue }
  const { data: p } = await sb.from('places').select('*').eq('id', q.id).single()
  const patch = {
    admin_notes: `${p.admin_notes ? p.admin_notes.trimEnd() + '\n' : ''}[community-report-resolved ${TODAY} (${q.reports.map(r => r.type).join(',')})] ${a.note}`,
    tags: [...new Set([...(p.tags || []).filter(t => !String(t).startsWith('community_report:')), ...(a.addTags || [])])],
    updated_at: new Date().toISOString(),
  }
  if (a.level && a.level !== p.vegan_level) { patch.vegan_level = a.level; patch.verification_method = VM }
  if (a.vlevel && a.vlevel > (p.verification_level || 0)) patch.verification_level = a.vlevel
  for (const k of ['name', 'category', 'subcategory', 'website', 'address', 'description']) if (a[k]) patch[k] = a[k]
  console.log(`${q.name.padEnd(20)} ${p.vegan_level} -> ${patch.vegan_level ?? '='} L${p.verification_level}->${patch.verification_level ?? '='} | ${Object.keys(patch).filter(k => !['admin_notes', 'tags', 'updated_at'].includes(k)).join(',')} | report ${a.report}${a.queue ? ' | +research item' : ''}`)
  if (!apply) continue
  rollback.push(p)
  const { error } = await sb.from('places').update(patch).eq('id', p.id)
  if (error) { console.log('  ERROR', error.message); continue }
  const pending = q.reports.filter(r => r.status === 'pending')
  for (const r of pending) {
    if (r.user_id && a.msg) {
      const { error: ne } = await sb.from('notifications').insert({ user_id: r.user_id, type: a.report === 'dismissed' ? 'report_dismissed' : 'report_reviewed', entity_type: 'place', entity_id: p.id, message: a.msg(patch.name || p.name) })
      if (ne) console.log('  notify ERROR', ne.message)
    }
  }
  if (pending.length) await sb.from('place_reports').update({ status: a.report }).in('id', pending.map(r => r.id))
  if (a.queue) {
    const { data: admin } = await sb.from('users').select('id').eq('username', 'admin').single()
    const { error: qe } = await sb.from('place_corrections').insert({ place_id: p.id, user_id: admin.id, status: 'pending', note: `CLI-REVIEW not-vegan-tab-${TODAY}: ${a.queue.reason} Check, then set the level from the place page.`, corrections: a.queue })
    if (qe) console.log('  queue ERROR', qe.message)
  }
  try { await fetch('https://www.plantspack.com/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.REVALIDATE_SECRET}` }, body: JSON.stringify({ place_id: p.id }) }) } catch {}
}
if (apply) fs.writeFileSync('reports/dq-2026-10-23/rollback-not-vegan-tab.json', JSON.stringify(rollback, null, 1))
console.log(`apply=${apply}`)
