// Canada data-quality pass 2026-10-30 (verify-country, P0/P1 safe fixes):
//   1. address/description: drop the false ", United States" suffix (geocoder artefact)
//   2. city names: region/district names -> the town (Nominatim reverse + local knowledge)
//   3. archive animal-centric chain rows (CLAUDE.md chain policy; admin imports only)
//   4. archive clear duplicates (same name or brand + same address; richer row kept)
//   5. Research Review items for rows a human must decide
// Dry-run by default; --apply writes. Rollback: reports/canada-audit-2026-10-30/rollback-run2.json
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const APPLY = process.argv.includes('--apply')
const TAG = 'canada-audit-2026-10-30'
const ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const all = []
for (let last = '00000000-0000-0000-0000-000000000000'; ;) {
  const { data, error } = await sb.from('places').select('id,slug,name,city,address,description,vegan_level,created_by,archived_at,archived_reason').eq('country', 'Canada').is('archived_at', null).gt('id', last).order('id').limit(1000)
  if (error) throw error
  all.push(...data); if (data.length < 1000) break; last = data.at(-1).id
}
const bySlug = Object.fromEntries(all.map(p => [p.slug, p]))

const CITY = {
  'Aldergrove, BC': 'Aldergrove', 'Campbellville, Ontario': 'Campbellville', 'De Winton, Alberta': 'De Winton',
  'Duncan, BC': 'Duncan', 'Kemptville, Ontario': 'Kemptville', 'District of North Vancouver': 'North Vancouver',
  'North Vancouver City': 'North Vancouver', 'Township of Langley': 'Langley', 'Laval (administrative region)': 'Laval',
  'Le Plateau-Mont-Royal': 'Montreal', 'Rosemont-Petite-Patrie': 'Montreal', 'Verdun': 'Montreal', 'Pierrefonds': 'Montreal',
  "St John's": "St. John's", 'St. John’s': "St. John's", 'St. Catherines': 'St. Catharines',
  'Muskoka Lakes Township': 'Muskoka Lakes', 'Whistler Resort': 'Whistler', 'Sun Peaks Mountain Resort': 'Sun Peaks',
  'North York': 'Toronto', 'Etobicoke': 'Toronto', 'Scarborough': 'Toronto',
  'Quebec': 'Quebec City', 'Salspring Island': 'Salt Spring Island', 'Salt Spring Island Electoral Area': 'Salt Spring Island',
  'University Endowment Lands': 'Vancouver', 'Electoral Area A': 'Vancouver', 'Area E': 'Gibsons',
  'Area E (Cowichan Station / Sahtlam / Glenora)': 'Duncan', 'Area F (Cherry Creek)': 'Port Alberni',
  'Area C (Christina Lake)': 'Christina Lake', 'Southern Gulf Islands Electoral Area': 'Galiano Island',
}
// city '' rows are all at Tsawwassen Mills, 4949 Canoe Pass Way (Nominatim: Delta)
const cityFor = p => p.city === '' && /4949 Canoe Pass Way/.test(p.address || '') ? 'Delta' : CITY[p.city]
const stripUS = s => s && s.replace(/,?\s*United States\b/g, '').replace(/,\s*$/, '').trim()

// Chain policy: Platonic form is animal-centric (burger, pizza, steak, shawarma/donair, deli sandwich, diner)
const CHAIN = /^(a ?& ?w|pizza pizza|boston pizza|earls|cactus club|original joe'?s|joey|osmow'?s|prairie donair|opa!? of greece|mr\.? sub|taco time|pita pit|extreme pita|edo japan|the keg|milestones|white spot|cora|big star sandwich|new orlean'?s pizza|uncle fatih'?s pizza)\b/i

// Same venue, same address: archive the first, keep the second
const DUPES = [
  ['tula-montreal', 'tula-les-repas-vegetaliens-equilibres-montreal'],
  ['fresh-toronto-2', 'fresh-by-juice-for-life-toronto'],
  ['fresh-toronto-3', 'fresh-by-juice-for-life-toronto-2'],
  ['green-cuisine-vegetarian-restaurant-victoria', 'green-cuisine-victoria'],
  ['swagruhas-dosa-home-mississauga-2', 'swagruhas-dosa-home-mississauga'],
  ['saravanaa-bhavan-mississauga-2', 'saravanaa-bhavan-mississauga'],
]

const REVIEW = [
  ['lulu-s-pasta-bar-montreal', 'canada_merge_duplicate', 'Same venue as lulu-s-bar-a-pates-montreal (1346 Rue Notre-Dame Ouest). One row says vegan_options, the other vegan_friendly. Merge and pick the level from the current menu.'],
  ['astoria-bistro-botanique-gatineau', 'canada_merge_duplicate', 'Same address as astoria-cafe-gatineau-2 (80 Promenade du Portage). Same venue or a rename? Merge if so.'],
  ['agave-express-regina', 'canada_merge_duplicate', 'Same address as agave-regina (Albert Street, S4R 2P5). Two concepts or one venue?'],
  ['the-gumboot-restaurant-roberts-creek', 'canada_merge_duplicate', 'Possible duplicate of the-gumboot-cafe-roberts-creek-2 (1041 vs 1053 Roberts Creek Road).'],
  ['india-village-ancaster', 'canada_merge_duplicate', 'Possible duplicate of india-village-restaurant-ancaster (307 vs 370 Wilson Street East). One address may be a typo.'],
  ['nourish-bistro-banff', 'canada_merge_duplicate', 'Possible duplicate of nourish-vegetarian-bistro-and-tea-house-banff (211 Bear Street vs 213-215 Banff Avenue). Nourish may have moved.'],
  ['resto-va-go-montreal', 'canada_merge_duplicate', 'Resto Vego: this row says 1204 avenue McGill College, resto-vego-montreal says 1720 Rue Saint-Denis. Check restovego.ca for the current site(s).'],
  ['vegateau-montreal-43665', 'canada_merge_duplicate', 'Vegateau: this OSM row (5610 Boulevard Saint-Laurent, vegan_friendly, no data) vs vegateau-montreal (1215 Mont-Royal Est, fully_vegan). Second branch or old address?'],
  ['la-diperie-montreal-2', 'canada_verify_vegan_level', 'Marked fully_vegan L3 by global-fv-l3-sweep-2026-05-25, but La Diperie is a dairy ice-cream chain with vegan options (the other row la-diperie-montreal is vegan_friendly). Likely vegan_options.'],
  ['havre-aux-glaces-montreal', 'canada_verify_vegan_level', 'Marked fully_vegan L3 by canada-fv-l3-upgrade-2026-05-25, but its own description says "vegan-friendly ice cream shop". Havre aux Glaces is known for dairy gelato. Likely vegan_friendly or vegan_options.'],
  ['iconoglace-montreal', 'canada_verify_vegan_level', 'fully_vegan L3, OSM says diet:vegan=yes (options), description says "délices végétaliens" among artisanal ice cream. Check iconoglace.ca: 100% vegan or mixed? Applies to iconoglace-montreal-2 too.'],
  ['ten-thousand-buddhas-sarira-stupa-niagara-falls', 'canada_verify_vegan_level', 'Listed as a fully vegan restaurant, but OSM and the site say it is a Buddhist temple (Cham Shan). If there is no public vegan restaurant on site, change category or archive.'],
  ['cofu-pressed-sushi-vancouver', 'verify_open_status', 'OSM now tags 1833 Anderson Street as shop=vacant. Check whether Cofu Pressed Sushi closed or moved.'],
  ['copper-branch-candiac', 'canada_verify_vegan_level', 'Copper Branch is a 100% plant-based chain; 4 rows (Candiac, Waterloo, Laval, Sainte-Therese) are vegan_friendly. Confirm each branch is still open on copperbranch.ca, then promote to fully_vegan or archive.'],
  ['ton-ton-sushi-vancouver', 'verify_open_status', 'The OSM object for this row is deleted. Check whether the venue is still open.'],
  ['meet-on-blanshard-victoria', 'verify_open_status', 'The OSM object for this row is deleted. Check whether the venue is still open.'],
  ['virtuous-pie-victoria', 'verify_open_status', 'The OSM object for this row is deleted. Virtuous Pie closed several sites; check this one.'],
  ['the-boombox-bakeshop-london', 'verify_open_status', 'The OSM object for this row is deleted. Check whether the venue is still open.'],
  ['caffe-della-pace-montreal', 'verify_open_status', 'The OSM object for this row is deleted. Check whether the venue is still open.'],
  ['website-nbsp-nbsp-nbsp-nbsp-nbsp-nbsp-nbsp-nbsp-nbsp-nbsp-nbsp-nbsp-canada', 'canada_verify_manually', 'Broken sanctuary import: name "Website&nbsp;..." and coordinates on the Canada centre point. The website is thealicesanctuary.org. Fix name, location and slug, or archive.'],
]

const plan = []
for (const p of all) {
  const upd = {}
  const city = cityFor(p); if (city && city !== p.city) upd.city = city
  const a = stripUS(p.address); if (a !== p.address) upd.address = a || ''
  const d = stripUS(p.description); if (d !== p.description) upd.description = d
  if (Object.keys(upd).length) plan.push({ p, upd, kind: 'fix' })
}
const archive = []
for (const p of all) if (CHAIN.test(p.name) && p.created_by === ADMIN && p.vegan_level !== 'fully_vegan') archive.push({ p, reason: 'chain-restaurant-policy' })
for (const [drop, keep] of DUPES) {
  const p = bySlug[drop]; if (!p || !bySlug[keep]) { console.log('MISSING dupe pair', drop, keep); continue }
  archive.push({ p, reason: `${TAG}: duplicate of ${keep}` })
}
const corrections = REVIEW.filter(([s]) => bySlug[s] || console.log('MISSING review', s)).map(([s, action, note]) => ({
  place_id: bySlug[s].id, user_id: ADMIN, status: 'pending', note: `CLI-REVIEW ${TAG}: ${note}`.slice(0, 1000),
  corrections: { proposed_action: action, source: TAG },
}))

for (const f of plan) console.log('FIX', f.p.slug, JSON.stringify(f.upd).slice(0, 160))
for (const a of archive) console.log('ARCHIVE', a.p.slug, a.p.vegan_level, a.reason)
console.log(`fixes ${plan.length} (city ${plan.filter(f => f.upd.city).length}, address ${plan.filter(f => 'address' in f.upd).length}, description ${plan.filter(f => f.upd.description).length}), archive ${archive.length}, review ${corrections.length}`)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }

fs.mkdirSync('reports/canada-audit-2026-10-30', { recursive: true })
fs.writeFileSync('reports/canada-audit-2026-10-30/rollback-run2.json', JSON.stringify({ fixes: plan.map(f => f.p), archived: archive.map(a => a.p) }, null, 1))
for (const f of plan) { const r = await sb.from('places').update(f.upd).eq('id', f.p.id); if (r.error) throw r.error }
const now = new Date().toISOString()
for (const a of archive) { const r = await sb.from('places').update({ archived_at: now, archived_reason: a.reason }).eq('id', a.p.id); if (r.error) throw r.error }
const r = await sb.from('place_corrections').insert(corrections); if (r.error) throw r.error
console.log(`applied ${plan.length} fixes, archived ${archive.length}, queued ${corrections.length}`)
