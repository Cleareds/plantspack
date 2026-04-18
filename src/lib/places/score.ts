/**
 * Combines every signal a staged candidate has — hard filter, website verify,
 * vegan classifier — into a 0..100 quality score and a final decision.
 *
 * Called by `scripts/staging-verify.ts` once website-verify has completed for
 * a row. The result is written to `place_staging.quality_score` and
 * `place_staging.decision`.
 */

import type { QualityGateResult } from './quality-gate'
import type { WebsiteSignal } from './website-verify'
import type { VeganSignalResult } from './vegan-signal'

export interface ScoreInput {
  gate: QualityGateResult
  website: WebsiteSignal | null
  vegan: VeganSignalResult
  /** Was the phone present from the source? */
  hasPhone: boolean
  /** date_refreshed from source — used for freshness bonus */
  dateRefreshed: string | null
  /** Country ISO-ish guess from source ('US' / 'United States'). Used for lang match. */
  country: string | null
}

export interface ScoreResult {
  score: number                          // 0-100
  decision: 'auto_import' | 'needs_review' | 'reject'
  reason: string
  breakdown: Record<string, number>      // component → points awarded
}

// Minimal country → expected html-lang map. Extend as needed.
const COUNTRY_TO_LANG: Record<string, string[]> = {
  'united states': ['en'], 'canada': ['en', 'fr'], 'united kingdom': ['en'],
  'ireland': ['en'], 'australia': ['en'], 'new zealand': ['en'],
  'germany': ['de'], 'austria': ['de'], 'switzerland': ['de', 'fr', 'it'],
  'france': ['fr'], 'belgium': ['fr', 'nl'],
  'spain': ['es'], 'mexico': ['es'], 'argentina': ['es'], 'chile': ['es'],
  'colombia': ['es'], 'peru': ['es'],
  'italy': ['it'], 'portugal': ['pt'], 'brazil': ['pt'],
  'netherlands': ['nl'], 'sweden': ['sv'], 'denmark': ['da'], 'norway': ['no', 'nb'],
  'finland': ['fi'], 'poland': ['pl'], 'czechia': ['cs'], 'hungary': ['hu'],
  'greece': ['el'], 'turkey': ['tr'],
  'japan': ['ja'], 'south korea': ['ko'], 'china': ['zh'],
  'taiwan': ['zh', 'zh-tw'], 'hong kong': ['zh', 'en'],
  'thailand': ['th'], 'vietnam': ['vi'], 'indonesia': ['id'],
  'philippines': ['en', 'tl'], 'india': ['en', 'hi'],
  'israel': ['he', 'en'],
}

function monthsBetween(earlier: Date, later: Date): number {
  return (later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24 * 30.436875)
}

export function scoreCandidate(input: ScoreInput): ScoreResult {
  const breakdown: Record<string, number> = {}
  const w = input.website
  const v = input.vegan

  // Gate already pre-filtered — but if it came through it passed required.
  if (input.gate.reject) {
    return {
      score: 0,
      decision: 'reject',
      reason: `gate:${input.gate.reject}`,
      breakdown: { hard_reject: 0 },
    }
  }

  // ---- Hard-fail branches that override the score ----
  if (v.level === 'vegetarian_reject') {
    return {
      score: 0,
      decision: 'reject',
      reason: `vegetarian_only_site`,
      breakdown: { vegan_reject: 0 },
    }
  }

  if (w && w.closure_hint) {
    return {
      score: 5,
      decision: 'reject',
      reason: `website_claims_closed`,
      breakdown: { closure_hint: 5 },
    }
  }

  if (w && w.parking) {
    return {
      score: 5,
      decision: 'reject',
      reason: `website_parking_page`,
      breakdown: { parking: 5 },
    }
  }

  if (w && !w.ok) {
    // Dead / unreachable website — drop to review but don't auto-reject,
    // could still be imported if rest is strong.
    breakdown.website_ok = 0
  } else if (w && w.ok) {
    breakdown.website_ok = 15
  }

  // ---- Additive components ----
  breakdown.required_fields = 15

  if (w && w.ld_json && w.ld_json.length > 0) breakdown.structured_data = 10
  else breakdown.structured_data = 0

  // Language match
  if (w && w.lang && input.country) {
    const expected = COUNTRY_TO_LANG[input.country.toLowerCase()] ?? []
    const langMain = w.lang.split('-')[0].toLowerCase()
    if (expected.includes(langMain)) breakdown.lang_match = 10
    else breakdown.lang_match = 0
  } else breakdown.lang_match = 0

  // Freshness
  breakdown.freshness = 0
  if (input.dateRefreshed) {
    const age = monthsBetween(new Date(input.dateRefreshed), new Date())
    if (age <= 12) breakdown.freshness = 10
    else if (age <= 24) breakdown.freshness = 5
  }

  // Menu link detected — usually signals a real operating restaurant
  breakdown.has_menu = w && w.menu_links.length > 0 ? 10 : 0

  // Vegan signal — the big one
  if (v.level === 'fully_vegan' && v.confidence >= 0.8) breakdown.vegan = 20
  else if (v.level === 'fully_vegan') breakdown.vegan = 15
  else if (v.level === 'vegan_friendly' && v.confidence >= 0.75) breakdown.vegan = 10
  else if (v.level === 'vegan_friendly') breakdown.vegan = 5
  else breakdown.vegan = 0

  breakdown.phone = input.hasPhone ? 5 : 0

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0)
  const clamped = Math.max(0, Math.min(100, score))

  // Decision thresholds.
  //
  // Important rule of thumb: if the vegan signal is `unknown`, the website
  // never said "vegan" strongly — on a vegan-category search that's strong
  // negative evidence. Such rows only go to review when they have otherwise
  // high metadata (language + structured data + freshness + menu).
  let decision: ScoreResult['decision']
  let reason: string
  if (v.level === 'unknown') {
    // No vegan evidence → demand solid metadata + live website to deserve
    // admin review. Everything else rejects (reversible — row stays in staging).
    if (clamped >= 60 && w && w.ok) {
      decision = 'needs_review'
      reason = `unknown_but_rich_metadata_${clamped}`
    } else {
      decision = 'reject'
      reason = `unknown_and_weak_${clamped}`
    }
  } else if (clamped >= 80) {
    decision = 'auto_import'
    reason = `score_${clamped}`
  } else if (clamped >= 55) {
    decision = 'needs_review'
    reason = `moderate_score_${clamped}`
  } else {
    decision = 'reject'
    reason = `low_score_${clamped}`
  }

  return { score: clamped, decision, reason, breakdown }
}
