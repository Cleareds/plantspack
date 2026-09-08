#!/usr/bin/env node
/**
 * Clear the Data Quality -> Research Review queue (21 pending rows), applying
 * one rule: archive what has no evidence, keep what has.
 *
 * "Evidence" on a vegan directory means evidence of the VEGAN claim, not just
 * that some business exists. Three of these rows are real, long-running
 * businesses (Hanky Panky Amsterdam, Pino Bros Ink Cambridge, the Aveda
 * Institutes) whose own sites say nothing about being vegan - they were
 * fabricated as vegan venues, so they are archived even though the shops are
 * real.
 *
 * Nothing is deleted. Every archive is a soft archive with archived_reason,
 * reversible, and no row here has any reviews.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const now = new Date().toISOString()
const ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

// correctionId -> what to do. reason goes into archived_reason.
const ARCHIVE = [
  { c: 'cb5d3c4a', reason: 'unverifiable-wellness-import: no vegan evidence', why: 'avedainstitutes.edu has no DNS; the real Nurtur Aveda Institutes site (avedainstitute.edu -> avedafi.edu) is a cosmetology school with zero mentions of vegan.' },
  { c: '0758e74a', reason: 'unverifiable-wellness-import: wrong city, no vegan evidence', why: 'ahimsa-yoga.de redirects to ahimsa-yoga-magdeburg.de - a real studio, but in Magdeburg not Berlin, and zero mentions of vegan.' },
  { c: 'be6d2287', reason: 'unverifiable-wellness-import: no vegan evidence', why: 'the real Amsterdam shop is hankypankytattoo.nl (200, "Tattoo shop in Amsterdam - Hanky Panky Tattoo") with zero mentions of vegan. Listed domain hankypanky.nl has no DNS.' },
  { c: '47cd66d7', reason: 'unverifiable-wellness-import: venue is in another country', why: 'no such studio in Portland OR. The real Tabula Rasa Tattoo is a vegan studio in Nijmegen, Netherlands.' },
  { c: '11f4d1a9', reason: 'unverifiable-wellness-import: no vegan evidence', why: 'Pino Bros Ink is real (36 JFK St, Cambridge MA, ~25 years, 224 Yelp reviews, pinobrosink.store) but nothing anywhere claims vegan ink. Listed domain pinobrothersink.com has no DNS.' },
  { c: '98d6b722', reason: 'unverifiable-wellness-import: venue does not exist as described', why: 'no Sacred Skin on the Lower East Side; the real "Sacred Skin Tattoos" is in Vestal NY, ~3h away.' },
  { c: '9bce97af', reason: 'unverifiable-wellness-import: venue not found', why: 'bethelightyogabk.com has no DNS on any resolver and no independent trace of the studio exists.' },
  { c: '6d8b124e', reason: 'unverifiable-wellness-import: conflated entry', why: 'vegancuts.co has no DNS. "Vegan Cuts" is a vegan subscription-box brand, not a San Francisco salon.' },
  { c: '3a69eb00', reason: 'unverifiable-wellness-import: venue not found', why: 'yoga-vegan.com has no DNS on any resolver and no independent trace of the studio exists.' },
  { c: 'b32ed488', reason: 'unverifiable-wellness-import: venue not found', why: 'plantpoweryoga.com has no DNS on any resolver and no independent trace of the studio exists.' },
  { c: 'a2a6f81d', reason: 'unverifiable-wellness-import: venue not found', why: 'veganinktattoo.de has no DNS on any resolver and no independent trace of the studio exists.' },
  { c: 'd570b996', reason: 'unverifiable-wellness-import: no vegan evidence', why: 'magnumopustattoo.com redirects to starlingtattoo.com, which is "STARLING TATTOO | Tattoo Studio in Brighton & Hove" - a different business in the UK, not Brooklyn, with zero mentions of vegan.' },
  { c: 'f5653de0', reason: 'chain-branch-not-on-official-locator', why: 'katzentempel.de/standorte/ lists 18 branches and Freiburg is not among them; /standorte/freiburg/ redirects to the homepage.' },
  { c: '431bcdef', reason: 'permanently_closed', why: 'VJFB Cologne (Hohenzollernring 21-23) opened Sept 2022; HappyCow now lists it as CLOSED and late-2024 reviews report it shut. Not among the chain\'s current locations.' },
  { c: '55bf432d', reason: 'permanently_closed', why: 'Alecrim - Arte & Gastronomia Vegetariana LTDA (CNPJ 08.951.561/0001-88) has registration status BAIXADA (formally dissolved), per Serasa Experian, updated 25/06/2026.' },
  { c: '83848934', reason: 'relocated: superseded by the Åsögatan 116 listing', why: 'Goodstore MOVED from Skånegatan 92 to Åsögatan 116 - owner Michael Ström said they outgrew the small Skånegatan shop, which closed and reopened as a 300sqm store with cafe/deli. The Åsögatan row already exists.', aliasTo: 'b4c4efa7-1ce4-4e30-801e-ddcd1d211d6b' },
]

// Keep, with the evidence that justified it. patch = corrections to apply.
const KEEP = [
  { c: '5d3080f1', patch: { verification_level: 3, verification_method: 'research-queue-2026-09-08' },
    why: 'the 2026-05-19 note was WRONG: Minden IS on katzentempel.de/standorte/ and /standorte/minden/ returns 200. Promoted L1 -> L3 (confirmed on the official chain locator).' },
  { c: '199a45f6', patch: { verification_level: 3, verification_method: 'research-queue-2026-09-08' },
    why: 'real fully-vegan restaurant at Rua Barão do Rio Branco 2734, run by Karollina Magalhães and Ariadna Mendes, covered by Secult Ceará, Diário do Nordeste and Sabores da Cidade. The complaint was erratic hours, not closure. Promoted L1 -> L3 on press cross-reference.' },
  { c: '2a92bafe', patch: { vegan_level: 'vegan_friendly', verification_level: 1, verification_method: 'research-queue-2026-09-08' },
    why: 'the 2026-05-21 note said it was "provisionally downgraded to vegan_options" but that never applied - it was still fully_vegan at L3. It is a northeastern Brazilian à la carte restaurant that serves meat with vegan starters, mains and desserts, so vegan_friendly per the CLAUDE.md definition. L3 dropped: the sources conflict.' },
  { c: '2f29c876', patch: null,
    why: 'already corrected to vegan_options earlier today. Kept: the reporter was physically in the cafe on 2026-09-03, so it is open, and there is a vegan breakfast plus a vegan cake - real vegan options, same standard applied to the other vegan_options venues in this pass.' },
]

// Already archived before this pass; just close the row.
const CLOSE_ONLY = [{ c: '5f155572', why: 'already archived 2026-07-23; Erlangen is not on katzentempel.de/standorte/ either.' }]

// Resolve short correction ids to full rows.
const { data: pending, error } = await sb.from('place_corrections')
  .select('id, place_id, note, places(name, slug, review_count, archived_at)')
  .eq('status', 'pending').not('corrections->>proposed_action', 'is', null)
if (error) throw error
const byPrefix = Object.fromEntries(pending.map(r => [r.id.slice(0, 8), r]))

let archived = 0, kept = 0, closed = 0
for (const a of ARCHIVE) {
  const row = byPrefix[a.c]
  if (!row) { console.log(`  ?? no pending row ${a.c}`); continue }
  const p = row.places || {}
  if ((p.review_count || 0) > 0) { console.log(`  SKIP (has reviews): ${p.name}`); continue }

  if (!p.archived_at) {
    if (a.aliasTo && p.slug) {
      await sb.from('place_slug_aliases')
        .upsert({ old_slug: p.slug, place_id: a.aliasTo }, { onConflict: 'old_slug', ignoreDuplicates: true })
    }
    const { error: e } = await sb.from('places')
      .update({ archived_at: now, archived_reason: a.reason }).eq('id', row.place_id)
    if (e) throw e
  }
  const { error: e2 } = await sb.from('place_corrections')
    .update({ status: 'approved', reviewed_by: ADMIN, reviewed_at: now, note: `${row.note}\n\nRESOLVED 2026-09-08 (archive): ${a.why}` })
    .eq('id', row.id)
  if (e2) throw e2
  console.log(`  ARCHIVED  ${p.name}  [${a.reason}]`)
  archived++
}

for (const k of KEEP) {
  const row = byPrefix[k.c]
  if (!row) { console.log(`  ?? no pending row ${k.c}`); continue }
  if (k.patch) {
    const { error: e } = await sb.from('places').update(k.patch).eq('id', row.place_id)
    if (e) throw e
  }
  const { error: e2 } = await sb.from('place_corrections')
    .update({ status: 'rejected', reviewed_by: ADMIN, reviewed_at: now, note: `${row.note}\n\nRESOLVED 2026-09-08 (keep): ${k.why}` })
    .eq('id', row.id)
  if (e2) throw e2
  console.log(`  KEPT      ${row.places?.name}${k.patch ? '  ' + JSON.stringify(k.patch) : ''}`)
  kept++
}

for (const c of CLOSE_ONLY) {
  const row = byPrefix[c.c]
  if (!row) { console.log(`  ?? no pending row ${c.c}`); continue }
  const { error: e } = await sb.from('place_corrections')
    .update({ status: 'approved', reviewed_by: ADMIN, reviewed_at: now, note: `${row.note}\n\nRESOLVED 2026-09-08: ${c.why}` })
    .eq('id', row.id)
  if (e) throw e
  console.log(`  closed    ${row.places?.name} (already archived)`)
  closed++
}
console.log(`\narchived: ${archived}   kept: ${kept}   closed-only: ${closed}`)
