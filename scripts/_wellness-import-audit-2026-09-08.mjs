#!/usr/bin/env node
/**
 * Audit of `source = wellness-import-2026-05-23` (21 rows), triggered by a
 * community report on "Vegan Hair Stockholm" - a place whose name matched no
 * real business. Checking the rest of the import found the same defect class
 * across most of it.
 *
 * Two things happen here, both non-destructive. Nothing is deleted or
 * archived: that call is the user's per the data policy in CLAUDE.md.
 *
 *  1. Rows whose website has NO DNS at all (checked against 1.1.1.1 and
 *     8.8.8.8) are demoted to verification_level 1. At L3 the public badge
 *     reads "Cross-referenced across multiple sources - matched against the
 *     venue's own website", which cannot be true of a domain that does not
 *     resolve. Demoting drops them to "External source", which is honest.
 *
 *  2. Every questionable row gets a place_corrections row carrying
 *     `proposed_action`, so it lands in Data Quality -> Research Review
 *     instead of existing only in a terminal transcript.
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const ADMIN = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'
const TAG = 'wellness-import-audit-2026-09-08'

// name -> finding. `demote` = the website does not resolve on any resolver.
const FINDINGS = {
  'Aveda Institute Manhattan': { demote: true, why: 'website avedainstitutes.edu has no DNS. Aveda Institutes are real cosmetology schools but this is not their domain, and a beauty school is not inherently vegan.' },
  'Be the Light Yoga':         { demote: true, why: 'website bethelightyogabk.com has no DNS. No corroborating evidence the studio exists.' },
  'Hanky Panky Tattooing':     { demote: true, why: 'website hankypanky.nl has no DNS. The Amsterdam shop is real (Henk Schiffmacher) but this is the wrong domain, and its vegan-ink claim is unverified.' },
  'Pino Brothers Ink':         { demote: true, why: 'website pinobrothersink.com has no DNS. The Cambridge MA shop appears real, so the domain may simply have lapsed - needs a current URL.' },
  'Plant Power Yoga':          { demote: true, why: 'website plantpoweryoga.com has no DNS. No corroborating evidence the studio exists.' },
  'Vegan Cuts':                { demote: true, why: 'website vegancuts.co has no DNS. "Vegan Cuts" is a known vegan subscription-box brand, not a San Francisco salon - likely a conflated entry.' },
  'Vegan Ink Tattoo Studio':   { demote: true, why: 'website veganinktattoo.de has no DNS. No corroborating evidence the studio exists.' },
  'Yoga Vegan UK':             { demote: true, why: 'website yoga-vegan.com has no DNS. No corroborating evidence the studio exists.' },
  'Tabula Rasa Tattoo':        { demote: true, why: 'no website, and no such studio in Portland OR. The real Tabula Rasa Tattoo is a vegan studio in Nijmegen, Netherlands (tabularasatattoo.com) - wrong city AND country.' },
  'Sacred Skin Tattoo':        { demote: false, why: 'no website, and no such shop on the Lower East Side. A "Sacred Skin Tattoos" exists in Vestal NY, ~3h from Manhattan. Already at L1.' },
  'Ahimsa Yoga Berlin':        { demote: false, why: 'ahimsa-yoga.de redirects to ahimsa-yoga-magdeburg.de - the studio looks real but is in Magdeburg, ~150km from Berlin. City is probably wrong.' },
  'Magnum Opus Tattoo':        { demote: false, why: 'magnumopustattoo.com redirects to starlingtattoo.com - the business appears to have been renamed. Name and vegan claim both need re-checking.' },
}

const { data: rows, error } = await sb.from('places')
  .select('id, name, city, country, website, verification_level, verification_method')
  .eq('source', 'wellness-import-2026-05-23')
if (error) throw error

let demoted = 0, filed = 0, skipped = 0
for (const p of rows) {
  const f = FINDINGS[p.name]
  if (!f) { skipped++; continue }

  if (f.demote && (p.verification_level ?? 0) > 1) {
    const { error: e } = await sb.from('places')
      .update({ verification_level: 1, verification_method: TAG })
      .eq('id', p.id)
    if (e) throw e
    demoted++
    console.log(`  demoted L${p.verification_level} -> L1  ${p.name}`)
  }

  // Dedup so a re-run does not stack review rows.
  const { data: dup } = await sb.from('place_corrections')
    .select('id').eq('place_id', p.id).contains('corrections', { audit: TAG }).maybeSingle()
  if (dup) continue

  const { error: e2 } = await sb.from('place_corrections').insert({
    place_id: p.id,
    user_id: ADMIN,
    status: 'pending',
    corrections: {
      audit: TAG,
      proposed_action: 'archive_or_repair',
      evidence: { name: p.name, city: p.city, country: p.country, website: p.website, finding: f.why },
    },
    note: `CLI-REVIEW ${TAG}: ${f.why} Admin to decide: find the correct venue + URL, or archive as unverifiable.`,
  })
  if (e2) throw e2
  filed++
}
console.log(`\ndemoted: ${demoted}  review rows filed: ${filed}  untouched: ${skipped}`)
