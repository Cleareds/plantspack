// Apply the 2026-10-01 community-report review. Evidence per row came from the
// venue's own site or a factual menu listing (see reports/reports-queue/). Rules:
// - vegan_level changes carry verification_method='community-report-verified-2026-10-01'
//   and never touch is_verified (CLI must not fake Admin/Confirmed).
// - archive = archived_at + archived_reason, never DELETE.
// - resolved reports -> status 'reviewed'; unverifiable ones stay pending (hold).
// - admin_notes gets an appended, dated line; community_report:* tags are cleared
//   on places whose reports are all resolved.
// Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]}))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const apply = process.argv.includes('--apply')
const TODAY = '2026-10-01'
const VM = `community-report-verified-${TODAY}`

// slug -> action. level: new vegan_level ('NULL' for orgs). archive: reason. hours: new opening_hours string.
// extra: other column patches. note: evidence line. reportStatus: 'reviewed' (default) | 'pending' (hold).
const ACTIONS = {
  // ---- demotions (menu shows meat / only vegan on request) ----
  'flamingo': { level: 'vegan_options', note: 'Bar+restaurant serving veg and non-veg incl. seafood (eazydiner listing)' },
  'le-quai-steffen-luxembourg': { level: 'vegan_options', note: 'Own site lists moules marinieres and hamburger, no vegan item named - lequaisteffen.lu' },
  'mr-doner-freiburg-im-breisgau': { level: 'vegan_friendly', note: 'Doner shop with a labelled vegan doner/falafel section (speisekarte.menu)' },
  'tigris-wurzburg': { level: 'vegan_options', note: 'Doner/pizza with Putenfleisch, only vegetarisch marked (speisekarte.de)' },
  'yomaro-wurzburg': { level: 'vegan_friendly', note: 'Dairy frozen yogurt with one rein pflanzliche soy variant - yomaro.de' },
  'chaska-indian-street-food-regensburg': { level: 'vegan_options', note: 'Own menu: chicken, lamb, paneer; no vegan labels - chaskaregensberg.de' },
  'goa-india-gottingen': { level: 'vegan_options', note: 'Own menu sections Haehnchen/Lamm/Fisch/Vegetarisch, no vegan marking - goaindia.de' },
  'piggs-wine-bar-edinburgh': { level: 'vegan_options', note: 'Tapas listing: chicken, chorizo, jamon, Manchego; no vegan dish named (squaremeal)' },
  'mr-clou-hannover': { level: 'vegan_options', extra: { verification_level: 1 }, note: 'Fast food with 2-3 vegan items; fully_vegan had no support; reporter saw meat (spinach.guide)' },
  '4': { level: 'vegan_friendly', note: 'Own site: premium meats, fresh seafood, plus options for vegan guests - 4rodies.gr' },
  'sushi-q-toronto': { level: 'vegan_options', note: 'Grab-and-go chain: salmon nigiri, shoyu ramen; only avocado/cucumber rolls plant-based' },
  'de-hallen-amsterdam': { level: 'vegan_friendly', note: 'Food hall, ~20 vendors incl. BBQ/burgers; several stalls have vegan dishes (iamsterdam)' },
  'das-quartier-freiburg-im-breisgau': { level: 'vegan_friendly', note: 'Own menu: pork schnitzel, beef burger, veal bratwurst; 2 dishes marked vegan - quartier-freiburg.de' },
  'zum-strandlaufer-althagen': { level: 'vegan_friendly', hours: 'Mo 12:30 - 22:00; Tu 12:30 - 22:00; We Closed; Th 12:30 - 22:00; Fr 12:30 - 22:00; Sa 12:30 - 22:00; Su 12:30 - 22:00', note: 'Own menu has meat + fish sections plus a Vegane Gerichte section; hours from own site (Betriebsferien 16.11-26.12.2026) - restaurant-zum-strandlaeufer.de' },
  'fig-cafe-hat-kai-bae': { level: 'vegan_options', note: 'Vegetarian cafe, most dishes can be made vegan on request, no labelled vegan items (iamkohchang)' },
  'organic-sandwich-company-boulder': { level: 'vegan_friendly', note: 'Own site: "Carnivore & Vegan Sandwiches" - clear labelled vegan options alongside meat - organicsandwichco.com' },
  'halo-animal-rescue-phoenix': { level: 'NULL', note: 'Animal shelter, not a food venue; organisations carry NULL vegan_level' },
  // ---- promotion (venue own words) ----
  'the-saucy-cow-dublin': { level: 'fully_vegan', extra: { verification_level: 3 }, note: 'Own site: "The best vegan restaurant, in the heart of Dublin City", "BIG DIRTY VEGAN"; HappyCow category Vegan - thesaucycow.com' },
  // ---- archives ----
  'plant-blonde-glasgow': { archive: 'Permanently closed: PLANT BLONDE LTD dissolved 11 Aug 2026 (Companies House SC671089); plantblonde.com no longer resolves', note: 'Companies House SC671089 dissolved 2026-08-11' },
  'the-button-warehouse-macclesfield': { archive: 'Not a food venue: own site states "WE DON\'T SERVE FOOD" (bar/live music)', note: 'thebuttonwarehouse.co.uk: no food served' },
  'fischerkate-althagen': { archive: 'Fish restaurant/smokehouse with no vegan item on the menu (community report + speisekarte.de)', note: 'Fischkaten Ahrenshoop: fish rolls, fish dishes, one vegetarian soup, no vegan item' },
  'claro-beagle-harrogate': { archive: 'Community report: no vegan options; no vegan evidence found (pub page 404, CAMRA generic pub listing)', note: 'No vegan evidence; reporter on site says no vegan food' },
  'grown-city-of-brisbane': { archive: 'Brand no longer operates: grownbne.com redirects to ALL DAY Cafe (no vegan/plant-based claim)', note: 'grownbne.com -> all-day.com.au' },
  // ---- hours ----
  'eclipse-bar-lounge-zurich': { hours: 'Mo 11:00 - 02:00; Tu 11:00 - 02:00; We 11:00 - 02:00; Th 11:00 - 02:00; Fr 11:00 - 05:00; Sa 12:00 - 05:00; Su 12:00 - 02:00', note: 'Hours from own site, matches reporter - eclipsebarlounge.com' },
  'green-hamster-tbilisi': { hours: 'Mo 12:00 - 21:00; Tu 12:00 - 21:00; We 12:00 - 21:00; Th 12:00 - 21:00; Fr 12:00 - 21:00; Sa 15:00 - 21:00; Su 15:00 - 21:00', note: 'Hours per reporter, matches HappyCow listing' },
  'hollycake-house-cafe-bakery-east-rochester': { hours: 'Mo Closed; Tu Closed; We Closed; Th 09:00 - 14:00; Fr 09:00 - 14:00; Sa 09:00 - 13:00; Su 09:00 - 13:00', note: 'Hours from own site - hollycakehouse.com' },
  'romeow-cat-bistrot-roma': { hours: 'Mo Closed; Tu 16:00 - 23:30; We 16:00 - 23:30; Th 16:00 - 23:30; Fr 16:00 - 23:30; Sa 10:00 - 23:30; Su 10:00 - 23:30', note: 'Hours from own site (restaurant service by reservation 13:00-15:45 / 20:00-23:00) - romeowcatbistrot.com/orari-e-informazioni-importanti' },
  'glow-juicery': { hours: 'Mo 09:00 - 17:30; Tu 09:00 - 17:30; We 09:00 - 17:30; Th 09:00 - 17:30; Fr 09:00 - 17:30; Sa 09:30 - 17:30; Su 11:00 - 17:00', extra: { name: 'The Glow Effect (formerly Glow Juicery)' }, note: 'Reporter: renamed The Glow Effect; hours per reporter + listing (Sun close 17:00 per listing)' },
  // ---- keep, but fix data / annotate ----
  'vegan-van-denver-2': { extra: { address: 'Park Hill Kitchens, 5155 E 39th Ave, Denver, CO 80207, United States' }, note: 'OPEN, relocated Oct 2024 from 3900 Elati St to 5155 E 39th Ave (own site veganvan.com, hours Mon-Sun 9-20); reporter saw the old address. Coordinates still need re-geocoding.' },
  'healthy-be-good-spain': { extra: { city: 'Las Palmas de Gran Canaria' }, note: 'City was "Spain"; venue is in Las Palmas de Gran Canaria. Described as completely plant-based (third party) - fully_vegan candidate pending own-source check' },
  'fundament-germany': { extra: { city: 'Mannheim' }, note: 'City was "Germany"; own site puts it in Mannheim (68159). Own site shows no vegetarian/vegan designation; L5 looks unsupported', reportStatus: 'pending' },
  'our': { note: 'Temporarily closed, moving location, reopening November 2026 (own site). Keep listed; google_temporarily_closed tag already set' },
}
// Reports verified as "keep" (level already right): clear the flag, keep the listing.
const KEEP = ['ratna-cafe','vitto-pitagorico-naples','mahjong-baltimore','bep-viet-paris','mister-vancouver','vierzehn-lorrach-kernstadt','takis-shelter-ierapetra','oia-gefsis-santorini','eb-bean-se-portland','rabenhorst-krakow-am-see','zum-standesamtchen-frankfurt-am-main','schwarzer-stern-frankfurt-am-main','taste-of-cambridge-cambridge','jardim-das-cerejas-lisboa','red-die-grune-kuche-heidelberg','restaurant-artha-porec','herbstapfel-kassel','vegeriet','surge-sanctuary-nottingham','domu-bangor','cal-reiet-holistic-retreat-santanyi','la-puerta-verde-haria','mamma-sushi','chop-chop','espresso-house-herrestad','spizzati-zurich','la-creperie-de-josselin','tbilisi-1']
// Everything else in the pending set stays pending (unverifiable: no own menu found).

const rows = JSON.parse(fs.readFileSync('reports/reports-queue/pending-2026-10-01.json','utf8')).filter(r => !r.place?.archived_at)
const bySlug = new Map()
for (const r of rows) { const s = r.place?.slug; if (!s) continue; if (!bySlug.has(s)) bySlug.set(s, []); bySlug.get(s).push(r) }
const missing = [...Object.keys(ACTIONS), ...KEEP].filter(s => !bySlug.has(s))
if (missing.length) console.log('WARN slugs not in pending set (check slug):', missing.join(', '))

let changed = 0, reviewed = 0, held = 0
for (const [slug, reps] of bySlug) {
  const a = ACTIONS[slug]; const keep = KEEP.includes(slug)
  if (!a && !keep) { held += reps.length; continue }
  const placeId = reps[0].place_id
  const { data: p, error } = await sb.from('places').select('id, name, vegan_level, tags, admin_notes, opening_hours, archived_at').eq('id', placeId).single()
  if (error || !p) { console.log('skip, place not found', slug); continue }
  const patch = {}
  const noteLine = `[community-report-resolved ${TODAY} (${[...new Set(reps.map(r => r.type))].join(',')})] ${a?.note ?? 'Verified: current level is right; listing kept.'}`
  patch.admin_notes = (p.admin_notes ? p.admin_notes.trimEnd() + '\n' : '') + noteLine
  if (a?.level) { patch.vegan_level = a.level === 'NULL' ? null : a.level; patch.verification_method = VM }
  if (a?.hours) patch.opening_hours = a.hours
  if (a?.extra) Object.assign(patch, a.extra)
  if (a?.archive) { patch.archived_at = new Date().toISOString(); patch.archived_reason = a.archive }
  const status = a?.reportStatus ?? 'reviewed'
  if (status === 'reviewed') patch.tags = (p.tags || []).filter(t => !String(t).startsWith('community_report:'))
  console.log(`${slug.padEnd(45)} ${p.vegan_level ?? 'null'} -> ${a?.level ?? '='}${a?.archive ? ' ARCHIVE' : ''}${a?.hours ? ' hours' : ''}${a?.extra ? ' ' + JSON.stringify(a.extra) : ''} | reports ${reps.length} -> ${status}`)
  if (!apply) continue
  const { error: e1 } = await sb.from('places').update(patch).eq('id', placeId)
  if (e1) { console.log('  ERROR place update', e1.message); continue }
  changed++
  if (status === 'reviewed') {
    const { error: e2 } = await sb.from('place_reports').update({ status: 'reviewed' }).in('id', reps.map(r => r.id))
    if (e2) console.log('  ERROR report update', e2.message); else reviewed += reps.length
  } else held += reps.length
  if (a?.archive || a?.level || a?.hours || a?.extra) {
    try { await fetch('https://www.plantspack.com/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.REVALIDATE_SECRET}` }, body: JSON.stringify({ place_id: placeId }) }) } catch {}
  }
}
console.log(`\napply=${apply}: places updated ${changed}, reports reviewed ${reviewed}, reports held pending ${held}`)
