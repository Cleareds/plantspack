#!/usr/bin/env node
/**
 * Work the Data Quality -> "Not vegan" queue (13 places).
 *
 * Mirrors what the admin UI's PATCH handler does: strip the community vegan
 * flags from `tags`, optionally set `vegan_level`, notify the reporter, and let
 * ISR revalidation follow. Report rows that are still `pending` are closed -
 * `reviewed` where we changed something, `dismissed` where we checked and kept
 * the listing. Rows an admin already moved off `pending` are left alone.
 *
 * Nothing is archived here. The two false `fully_vegan` labels are the urgent
 * part: a wrong fully_vegan is a public claim the honesty rule in CLAUDE.md
 * forbids, so those are corrected now and the policy question (does a
 * vegetarian cafe belong at all?) is filed for review instead of guessed.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

const VEGAN_REPORT_TAGS = [
  'community_report:not_fully_vegan', 'community_report:not_vegan_friendly',
  'community_report:non_vegan_chain', 'community_report:vegan_friendly_chain',
  'community_report:few_vegan_options', 'community_report:actually_fully_vegan',
  'google_review_flag',
]

// setLevel = act on the report. null = the label already matches what the
// reporter described, so there is nothing to change -> dismiss.
const DECISIONS = [
  { id: 'a495b84d-db75-418b-af24-44453b499eee', name: 'Krameramtsstuben', setLevel: 'vegan_options',
    why: 'was fully_vegan. krameramtsstuben.de/speisekarte lists Hausgemachte Rinderroulade, Bandnudeln mit Zander in Hummersoße and Huftsteak, with a single dish under "HAUPTGERICHTE Vegetarisch/Vegan". A traditional Hamburg Labskaus/Pannfisch restaurant with one vegan main.' },
  { id: '9f2d9c32-f2c4-43e5-9bbf-1ec1bfee801b', name: 'Fräulein Mayer', setLevel: 'vegan_options',
    why: 'was fully_vegan. On-site reporter: "es gibt nur einen veganen Kuchen, sonst nicht vegan und nur ein rein veganes Gericht auf der Speisekarte". Listings describe it as a vegetarian upcycling cafe with a vegan offering.' },
  { id: 'd1677529-e44e-4ec5-85a9-52662983bcba', name: 'Bangkok Wok', setLevel: 'vegan_options',
    why: 'was vegan_friendly. Reporter: "I have been there many times and they only have a few vegan dishes." vegan_options is the accurate tier.' },

  // Already at vegan_options, the weakest tier - which is exactly what each
  // reporter described. The listing is correct as it stands; clear the flag.
  { id: '304041fd-a504-41ab-bb01-ae6e08413d02', name: 'Sushiro', setLevel: null, why: 'already vegan_options; "no vegan menu, only a few veganizable dishes" matches that tier.' },
  { id: '2b0d87a5-7039-4575-958f-84db2b3f32a0', name: 'King Falafel', setLevel: null, why: 'already vegan_options; veganizable falafel + vegan meze matches that tier.' },
  { id: '0833e58c-1e0a-48fa-9fbe-7bcb653bafa2', name: 'Wasabi Sushi', setLevel: null, why: 'already vegan_options; "a vegan mix of sushi can be ordered" matches that tier.' },
  { id: 'f85d668a-72dc-4bf3-b1d8-1b3f1d78f35e', name: 'Orientköket', setLevel: null, why: 'already vegan_options; "only falafel available" matches that tier.' },
  { id: 'f0601676-d837-4daa-9a48-25a3712a186f', name: 'Coffee Roomer', setLevel: null, why: 'already vegan_options; "2 vegan dishes on the menu" matches that tier.' },
  { id: '714b8e87-ddf4-4a8f-90c0-a0a0344e0a04', name: 'Einars konditori', setLevel: null, why: 'already vegan_options; "a few very basic vegan items, some pre-orderable" matches that tier.' },
  { id: 'b50f1462-1506-4316-8872-c1185273aca1', name: 'Krog & Co', setLevel: null, why: 'already vegan_options; "only one vegan option on the menu" matches that tier.' },
  { id: 'f297ac38-e47b-430a-b93c-4bcddde01ece', name: 'Pizzaria Luzzo', setLevel: null, why: 'already vegan_options; "a couple of salads alongside bread and olive oil" matches that tier.' },
  { id: '8d57c3a3-73d0-405a-9ea8-120f89ffd20a', name: 'Agora', setLevel: null, why: 'already vegan_options; a kebab shop with frozen falafel as the vegan option matches that tier.' },
  { id: 'd3f35508-7d70-4287-8297-e79a2d831e8d', name: 'Wards Konditori', setLevel: null, why: 'flagged not_vegan_friendly but it is already vegan_options, a tier BELOW vegan_friendly, so the listing already says what the reporter said.' },
]

const RESEARCH = [{
  place_id: '9f2d9c32-f2c4-43e5-9bbf-1ec1bfee801b',
  note: 'CLI-REVIEW vegan-reports-2026-09-08: Fräulein Mayer (Witten) corrected fully_vegan -> vegan_options. Two open questions for an admin: (1) listings call it a VEGETARIAN cafe, and per the vegan-not-vegetarian policy a vegetarian venue may not belong on the platform at all; (2) HappyCow marks it CLOSED since Oct 2022 though later reviews suggest it still trades. Decide keep vs archive.',
}]

let acted = 0, dismissed = 0
for (const d of DECISIONS) {
  const { data: p, error } = await sb.from('places')
    .select('id, name, slug, city, country, tags, vegan_level').eq('id', d.id).single()
  if (error) throw error

  const tags = (p.tags || []).filter(t => !VEGAN_REPORT_TAGS.includes(t))
  const patch = { tags, updated_at: new Date().toISOString() }
  if (d.setLevel) patch.vegan_level = d.setLevel

  const { error: e } = await sb.from('places').update(patch).eq('id', d.id)
  if (e) throw e

  // Close only reports still pending; don't revise an admin's earlier call.
  const { data: pend } = await sb.from('place_reports')
    .select('id, user_id').eq('place_id', d.id).eq('status', 'pending')
  if (pend?.length) {
    const status = d.setLevel ? 'reviewed' : 'dismissed'
    await sb.from('place_reports').update({ status }).in('id', pend.map(r => r.id))
    for (const r of pend.filter(r => r.user_id)) {
      await sb.from('notifications').insert({
        user_id: r.user_id, actor_id: null,
        type: d.setLevel ? 'report_reviewed' : 'report_dismissed',
        entity_type: 'place', entity_id: d.id,
        message: d.setLevel
          ? `Thanks! We reviewed your report on ${p.name} and updated the listing.`
          : `We reviewed your report on ${p.name} and kept the current listing for now. Thanks for helping keep Plants Pack accurate.`,
      })
    }
  }

  if (d.setLevel) { acted++; console.log(`  ACTED    ${p.name}: ${p.vegan_level} -> ${d.setLevel}`) }
  else { dismissed++; console.log(`  dismissed ${p.name} (label already correct)`) }
}

for (const r of RESEARCH) {
  const { data: dup } = await sb.from('place_corrections').select('id')
    .eq('place_id', r.place_id).contains('corrections', { audit: 'vegan-reports-2026-09-08' }).maybeSingle()
  if (dup) continue
  const { error } = await sb.from('place_corrections').insert({
    place_id: r.place_id, user_id: ADMIN, status: 'pending',
    corrections: { audit: 'vegan-reports-2026-09-08', proposed_action: 'archive_or_keep' },
    note: r.note,
  })
  if (error) throw error
  console.log(`  filed review row for ${r.place_id.slice(0, 8)}`)
}
console.log(`\nlevel corrected: ${acted}   dismissed: ${dismissed}`)
