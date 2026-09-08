#!/usr/bin/env node
/**
 * Resolve the 7 duplicate reports that carry a real human note (the other 452
 * pending rows are machine-seeded "auto: possible duplicate (Nm apart)" pairs
 * and are handled separately).
 *
 * Every archive follows the convention set by migration 20260427210000:
 * alias the loser's slug to the winner so old URLs keep resolving, set
 * archived_at + archived_reason. Nothing is deleted, and no row with reviews
 * is touched (all losers here have review_count = 0, asserted below).
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const now = new Date().toISOString()

// --- archives: loser -> winner, with the evidence that settled it -----------
const MERGES = [
  {
    loser: 'e8443cbb-de59-40ed-b6d8-8f6cb906db48', winner: 'ab46ba54-b2bc-4668-9b13-ba073f965a9d',
    why: 'WAY Keizerpoort Ghent. way.gent/pages/way-keizerpoort gives one address, "Brusselsesteenweg 4 9050 Gent", and also says the shop "ligt op een rustige plek aan de Franse Vaart" - so the OSM row (Fransevaart) and the manual row are the same shop. Keeping the manual row: fully_vegan, admin-verified, hours, image, website.',
  },
  {
    loser: 'c7b184aa-fe9c-4de5-9220-fe775be255bb', winner: 'e609571f-e665-467c-b3b7-70aa0a4e77d4',
    why: 'Slice + Dice Norwich. Reporter named the keeper. The loser has no street address and its website sliceanddicenorwich.co.uk has no DNS; the keeper carries 10-12 Saint Benedicts Street, hours, image, and sliceanddice.cafe returns 200.',
  },
  {
    loser: 'c7af20e5-02f0-4715-8a68-7c3865496bb6', winner: 'a524d990-5d83-418a-9c5a-54f534c5becd',
    why: 'Loaf B&B Berwick-upon-Tweed, same postcode TD15 2XQ. loafbnb.co.uk calls itself a "riverside b&b apartment" reached by walking "along the riverside", which supports the keeper\'s Riverside Road over the loser\'s Mount Pleasant. The site also says vegan breakfasts and a prep area "for vegan food only", so the keeper\'s fully_vegan is right and the loser\'s mostly_vegan is wrong. Loser\'s website was only a veggie-hotels.de listing page.',
  },
  {
    loser: 'bf349811-c979-47ab-af3a-656c3beec071', winner: 'ed0a1083-01b0-4c25-8004-bf0b59b6c7de',
    why: 'Kyffin, Bangor. The report note was just "Kyffin" - naming the twin. "129 High Street" and "129 Stryd Fawr" are the same address (Stryd Fawr is Welsh for High Street). Keeping the OSM row: website, hours, image, and coordinates actually in Bangor - the loser sits 7.5km off and its description says "Vegetarian", not vegan.',
  },
  {
    loser: '0a455074-b9ab-41e0-9d83-eda974e274db', winner: '31801138-9f92-4270-84e6-6a8bdc1106a0',
    why: 'Baristo Vegan Deli Kiel. Reporter named the keeper. The loser has the generic address "Kiel city centre, Germany", no website, no hours, no image; the keeper has 16 Schuelperbaum, hours, image and baeristo.com.',
  },
]

// --- in-place fixes ---------------------------------------------------------
const FIXES = [
  {
    id: 'ab46ba54-b2bc-4668-9b13-ba073f965a9d',
    patch: { address: 'Brusselsesteenweg 4, 9050 Gent, Belgium', latitude: 51.04106, longitude: 3.7406068 },
    why: 'postcode corrected to 9050 per way.gent; moved onto the OSM row\'s coordinates, which the reporter (a local) said was the accurate position.',
  },
  {
    id: 'f9d8a6d5-5f66-4d73-9959-53502aed9444',
    patch: { address: '4943 NE Martin Luther King Jr Blvd, Portland, OR', latitude: 45.5589953, longitude: -122.661751 },
    why: 'not a duplicate at all - the reporter said "They have moved to Martin Luther King Blvd." Yelp and order.online both list Sushi Love at 4943 NE MLK Jr Blvd (CORE PDX food pod). Old address was 1112 SE Tacoma St.',
  },
  {
    id: 'b4c4efa7-1ce4-4e30-801e-ddcd1d211d6b',
    patch: { address: 'Åsögatan 116, 116 24 Stockholm, Sweden' },
    why: 'not a duplicate - the two Goodstore rows are two different addresses 415m apart, and this row had an empty address. goodstore.se lists only Åsögatan 116, which this row\'s coordinates match to 8m.',
  },
]

// Reports to close once the above is done.
const REPORTS = [
  'f909b0c7-5e47-4b68-bf22-fda0775978cc', '0276219a-eea8-4c59-8b8f-bf42f66b7d00',
  'd29cc126-9680-4136-8ef9-e4ea04e165c9', '02a5544a-e54c-4ebd-ad14-7318dbbc6dea',
  '76761209-5f6c-4c48-90e8-acd651a5a2cb', '24cd7849-fa80-41a8-9559-80bd3f5ccec9',
  'dce66f56-490b-49a2-8264-862ec534a875',
]

// The one thing I could not settle: is the original Skånegatan 92 shop still open?
const RESEARCH = [{
  place_id: '0a36f6de-ff2a-44d4-bcf9-a15c6bbbabb1',
  note: 'CLI-REVIEW duplicate-reports-2026-09-08: Goodstore Skånegatan 92 is the original 2006 shop. goodstore.se now lists ONLY Åsögatan 116, and HappyCow shows the Hornsgatan branch as CLOSED - so Skånegatan may be closed or relocated. Not archived on that inference. Admin to confirm whether Skånegatan 92 still trades.',
}]

let ok = 0, warn = 0
for (const m of MERGES) {
  const { data: pair, error } = await sb.from('places')
    .select('id, name, slug, review_count, archived_at').in('id', [m.loser, m.winner])
  if (error) throw error
  const loser = pair.find(p => p.id === m.loser)
  const winner = pair.find(p => p.id === m.winner)
  if (!loser || !winner) { console.log(`  SKIP (id not found): ${m.loser} / ${m.winner}`); warn++; continue }
  if (loser.archived_at) { console.log(`  SKIP (already archived): ${loser.name}`); continue }
  if ((loser.review_count || 0) > 0) { console.log(`  SKIP (loser has reviews): ${loser.name}`); warn++; continue }

  if (loser.slug) {
    await sb.from('place_slug_aliases')
      .upsert({ old_slug: loser.slug, place_id: winner.id }, { onConflict: 'old_slug', ignoreDuplicates: true })
  }
  const { error: e } = await sb.from('places')
    .update({ archived_at: now, archived_reason: `duplicate_merged_into:${winner.id}` })
    .eq('id', loser.id)
  if (e) throw e
  console.log(`  archived  ${loser.name}  ->  keeps ${winner.name}`)
  ok++
}

for (const f of FIXES) {
  const { error } = await sb.from('places').update(f.patch).eq('id', f.id)
  if (error) throw error
  console.log(`  fixed     ${f.id.slice(0, 8)}  ${Object.keys(f.patch).join(', ')}`)
}

for (const r of RESEARCH) {
  const { data: dup } = await sb.from('place_corrections').select('id')
    .eq('place_id', r.place_id).contains('corrections', { audit: 'duplicate-reports-2026-09-08' }).maybeSingle()
  if (dup) continue
  const { error } = await sb.from('place_corrections').insert({
    place_id: r.place_id, user_id: ADMIN, status: 'pending',
    corrections: { audit: 'duplicate-reports-2026-09-08', proposed_action: 'confirm_still_open' },
    note: r.note,
  })
  if (error) throw error
  console.log(`  filed review row for ${r.place_id.slice(0, 8)}`)
}

const { error: re } = await sb.from('place_reports').update({ status: 'reviewed' }).in('id', REPORTS)
if (re) throw re
console.log(`\narchived: ${ok}  fixed: ${FIXES.length}  reports closed: ${REPORTS.length}  warnings: ${warn}`)
