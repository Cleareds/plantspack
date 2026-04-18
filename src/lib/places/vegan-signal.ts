/**
 * Vegan-level classifier for a staged candidate.
 *
 * Consumes the `WebsiteSignal` from src/lib/places/website-verify.ts plus
 * optional OSM/FSQ hints, and returns one of:
 *   'fully_vegan'       - confident 100% vegan
 *   'vegan_friendly'    - has vegan options alongside non-vegan
 *   'vegetarian_reject' - strict vegetarian, no vegan evidence → do not import
 *   'unknown'           - not enough signal → needs_review
 *
 * Evidence is recorded so admin can audit every decision in
 * `place_staging.vegan_evidence`.
 */

import {
  FULLY_VEGAN_PHRASES,
  VEGAN_FRIENDLY_PHRASES,
  VEGETARIAN_ONLY_PHRASES,
  VEGAN_WORD,
  VEGETARIAN_WORD,
} from './vegan-lexicon'
import type { WebsiteSignal } from './website-verify'

export type VeganLevel = 'fully_vegan' | 'vegan_friendly' | 'vegetarian_reject' | 'unknown'

export interface VeganSignalInput {
  name?: string | null
  /** Source category strings from FSQ / VegGuide. */
  sourceCategories?: string[] | null
  /** OSM `diet:vegan` tag if present ('only' | 'yes' | 'limited'). */
  osmDietVegan?: 'only' | 'yes' | 'limited' | null
  /** Result of website-verify.ts. We look at title, description, body_excerpt, ld_json. */
  website?: WebsiteSignal | null
}

export interface VeganSignalEvidence {
  rule: string
  match?: string
}

export interface VeganSignalResult {
  level: VeganLevel
  confidence: number  // 0..1
  evidence: VeganSignalEvidence[]
}

// Rank LD-JSON fragments for vegan-relevant fields (servesCuisine, keywords, description).
function ldJsonServesCuisine(blocks: any[]): string[] {
  const out: string[] = []
  const walk = (node: any) => {
    if (!node) return
    if (Array.isArray(node)) { node.forEach(walk); return }
    if (typeof node !== 'object') return
    if (node.servesCuisine) {
      if (Array.isArray(node.servesCuisine)) out.push(...node.servesCuisine.filter(Boolean).map(String))
      else out.push(String(node.servesCuisine))
    }
    if (node.keywords) out.push(String(node.keywords))
    if (node.description) out.push(String(node.description))
    if (node['@graph']) walk(node['@graph'])
  }
  walk(blocks)
  return out
}

function firstMatch(re: RegExp, s: string): string | null {
  const m = s.match(re)
  return m ? (m[0].length > 120 ? m[0].slice(0, 120) : m[0]) : null
}

function anyPhraseMatch(phrases: RegExp[], text: string): string | null {
  for (const re of phrases) {
    const m = text.match(re)
    if (m) return m[0].slice(0, 120)
  }
  return null
}

export function classifyVegan(input: VeganSignalInput): VeganSignalResult {
  const evidence: VeganSignalEvidence[] = []
  const name = input.name ?? ''
  const website = input.website ?? null
  const fields = [
    website?.title ?? '',
    website?.description ?? '',
    Object.values(website?.og ?? {}).join(' '),
    ...(website?.ld_json ? ldJsonServesCuisine(website.ld_json) : []),
    website?.body_excerpt ?? '',
  ].join(' \n ')

  // ---- Rule 1: OSM diet:vegan=only → fully_vegan (strongest DB-side signal) ----
  if (input.osmDietVegan === 'only') {
    evidence.push({ rule: 'osm_diet_vegan_only' })
    return { level: 'fully_vegan', confidence: 0.95, evidence }
  }

  // ---- Rule 2: Strong "100% vegan" phrases on the site ----
  const fullyMatch = anyPhraseMatch(FULLY_VEGAN_PHRASES, fields)
  if (fullyMatch) {
    evidence.push({ rule: 'fully_vegan_phrase', match: fullyMatch })
    return { level: 'fully_vegan', confidence: 0.9, evidence }
  }

  // ---- Rule 3: LD-JSON servesCuisine === "Vegan" (single entry, no vegetarian) ----
  const cuisines = website?.ld_json ? ldJsonServesCuisine(website.ld_json) : []
  const cuisineBlob = cuisines.join(' | ').toLowerCase()
  if (cuisineBlob && /\bvegan\b/.test(cuisineBlob) && !/\bvegetarian\b/.test(cuisineBlob)) {
    evidence.push({ rule: 'ld_json_vegan_cuisine', match: cuisineBlob.slice(0, 120) })
    return { level: 'fully_vegan', confidence: 0.85, evidence }
  }

  // ---- Rule 4: Name has "vegan" and NOT "vegetarian" ----
  if (VEGAN_WORD.test(name) && !VEGETARIAN_WORD.test(name)) {
    evidence.push({ rule: 'name_vegan_only', match: name.slice(0, 120) })
    return { level: 'fully_vegan', confidence: 0.75, evidence }
  }

  // ---- Rule 5: OSM diet:vegan = yes | limited → vegan_friendly ----
  if (input.osmDietVegan === 'yes' || input.osmDietVegan === 'limited') {
    evidence.push({ rule: `osm_diet_vegan_${input.osmDietVegan}` })
    return { level: 'vegan_friendly', confidence: 0.8, evidence }
  }

  // ---- Rule 6: Website mentions "vegan options" / friendly phrases ----
  const friendlyMatch = anyPhraseMatch(VEGAN_FRIENDLY_PHRASES, fields)
  if (friendlyMatch) {
    evidence.push({ rule: 'vegan_friendly_phrase', match: friendlyMatch })
    return { level: 'vegan_friendly', confidence: 0.75, evidence }
  }

  // ---- Rule 7: FSQ category "Vegan and Vegetarian" + "vegan" appears in body anywhere ----
  const isFsqVegCategory = (input.sourceCategories ?? []).some(c => /vegan.*vegetarian|vegetarian.*vegan/i.test(c))
  if (isFsqVegCategory && VEGAN_WORD.test(fields) && VEGETARIAN_WORD.test(fields)) {
    evidence.push({ rule: 'fsq_mixed_category_with_vegan_mention' })
    return { level: 'vegan_friendly', confidence: 0.7, evidence }
  }

  // ---- Rule 8: Strict-vegetarian-only — title/body says "vegetarian restaurant" with no vegan phrase ----
  const vegetarianOnly = anyPhraseMatch(VEGETARIAN_ONLY_PHRASES, fields)
  if (vegetarianOnly && !VEGAN_WORD.test(fields)) {
    evidence.push({ rule: 'vegetarian_only_phrase', match: vegetarianOnly })
    return { level: 'vegetarian_reject', confidence: 0.9, evidence }
  }

  // ---- Rule 9: Fallback — insufficient signal ----
  // A single stray "vegan" mention on a non-vegan-category page is too noisy.
  // We now require at least two independent "vegan" hits to avoid false
  // positives on markets/reviews/social embeds that casually say "vegan" once.
  if (VEGAN_WORD.test(fields)) {
    const matches = fields.match(new RegExp(VEGAN_WORD.source, 'giu')) ?? []
    if (matches.length >= 2) {
      evidence.push({ rule: 'multiple_vegan_mentions', match: `×${matches.length}` })
      return { level: 'vegan_friendly', confidence: 0.55, evidence }
    }
  }

  evidence.push({ rule: 'no_signal' })
  return { level: 'unknown', confidence: 0.2, evidence }
}
