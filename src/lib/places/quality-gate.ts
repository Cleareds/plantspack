/**
 * Tier-1 hard filter for pre-import candidates.
 *
 * Runs in-process on each staging row. Fast, no network calls. Returns the
 * first failed rule or `null` if the row passes. Failed rows get
 * `decision='reject'` with `decision_reason=<rule>` and stay in staging
 * forever for post-hoc auditing.
 *
 * Called by:
 *   - `scripts/foursquare-import-candidates.ts` (FSQ adapter → staging)
 *   - `scripts/staging-verify.ts` before the website-verify pass
 *   - any future source adapter
 *
 * Rules implement the "strict-vegan first batch" spec in the plan §11.4.2.
 */

import { isChainName, normalize } from './matching'

export interface QualityGateInput {
  name?: string | null
  latitude?: number | null
  longitude?: number | null
  city?: string | null
  country?: string | null
  address?: string | null
  website?: string | null
  /** ISO date string; if present, must be within 24 months. If missing, pass. */
  date_refreshed?: string | null
  /** Source categories — used to pass the FSQ "Vegan and Vegetarian" category check */
  categories?: string[] | null
}

export interface QualityGateConfig {
  /** Require the name to contain "vegan" AND not "vegetarian". Enabled for strict-vegan-only imports. */
  strictVeganNameFilter: boolean
  /** Hard-require a website. Enabled for any post-Phase-2 import. */
  requireWebsite: boolean
  /** Reject if `date_refreshed` is older than this. Null means disabled. */
  maxStaleMonths: number | null
  /** Set of lowercased ISO-ish country names we exclude entirely. */
  excludedCountries: ReadonlySet<string>
}

// Default gate: required fields + website + freshness + chain + region.
// Vegan-vs-vegetarian is NOT decided here — it's Tier 2 via
// src/lib/places/vegan-signal.ts reading the actual website content.
// Ultra-strict name filter is available for callers that want it.
export const DEFAULT_CONFIG: QualityGateConfig = {
  strictVeganNameFilter: false,
  requireWebsite: true,
  maxStaleMonths: 24,
  excludedCountries: new Set(['russia', 'russian federation']),
}

export const ULTRA_STRICT_CONFIG: QualityGateConfig = {
  ...DEFAULT_CONFIG,
  strictVeganNameFilter: true,
}

export type RejectReason =
  | 'name_missing'
  | 'coords_invalid'
  | 'city_missing'
  | 'country_missing'
  | 'address_incomplete'
  | 'website_missing'
  | 'chain_name'
  | 'excluded_region'
  | 'stale_data'
  | 'name_mentions_vegetarian'
  | 'name_lacks_vegan'

export interface QualityGateResult {
  reject: RejectReason | null
  /** Derived boolean helpers so the caller can set column flags directly */
  required_fields_ok: boolean
  freshness_ok: boolean
  chain_filtered: boolean
}

// Words meaning "vegan" in various languages. Expanded when admin review
// finds misses. Case-insensitive, word-boundary matched.
const VEGAN_WORDS = [
  'vegan', 'vegano', 'vegana', 'veganer', 'veganes', 'veganska', 'veganski',
  'végétalien', 'végétalienne', 'wegański', 'wegańska', 'wegan',
  'veganisch', 'veganisk', 'veganske', 'vegaaninen', 'veganisku',
  'ヴィーガン', 'ビーガン', '비건', '纯素', '純素', 'веганский', 'веганское',
]

// Words meaning "vegetarian" that — if present AND "vegan" is absent — eject
// the candidate from the strict-vegan batch. Case-insensitive.
const VEGETARIAN_WORDS = [
  'vegetarian', 'vegetariana', 'vegetariano', 'vegetarier', 'vegetarisch',
  'végétarien', 'végétarienne', 'vegetariska', 'vegetarisk',
  'wegetariański', 'wegetariańska', 'kasvissyöjä',
  'ベジタリアン', '베지테리언', '素食', 'вегетарианский',
]

const veganRegex = new RegExp(`\\b(${VEGAN_WORDS.join('|')})\\b`, 'iu')
const vegetarianRegex = new RegExp(`\\b(${VEGETARIAN_WORDS.join('|')})\\b`, 'iu')

export function nameHasVegan(name: string): boolean {
  return veganRegex.test(name)
}

export function nameHasVegetarian(name: string): boolean {
  return vegetarianRegex.test(name)
}

function monthsBetween(earlier: Date, later: Date): number {
  return (later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24 * 30.436875)
}

export function hardFilter(
  row: QualityGateInput,
  config: QualityGateConfig = DEFAULT_CONFIG,
): QualityGateResult {
  const name = (row.name ?? '').trim()

  // ---- Required fields ----
  if (!name) return skip('name_missing', { required: false })
  const lat = row.latitude, lng = row.longitude
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return skip('coords_invalid', { required: false })
  }
  if (lat === 0 && lng === 0) return skip('coords_invalid', { required: false })
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return skip('coords_invalid', { required: false })

  const city = (row.city ?? '').trim()
  const country = (row.country ?? '').trim()
  if (!city) return skip('city_missing', { required: false })
  if (!country) return skip('country_missing', { required: false })

  const address = (row.address ?? '').trim()
  // Accept either an explicit address OR city+country with ≥8 chars combined.
  if (!address && `${city} ${country}`.length < 8) return skip('address_incomplete', { required: false })

  if (config.requireWebsite && !(row.website ?? '').trim()) {
    return skip('website_missing', { required: false })
  }

  // ---- Region exclusion ----
  if (config.excludedCountries.has(country.toLowerCase())) {
    return skip('excluded_region', { required: true })
  }

  // ---- Chain filter ----
  if (isChainName(name)) {
    return { reject: 'chain_name', required_fields_ok: true, freshness_ok: true, chain_filtered: true }
  }

  // ---- Freshness ----
  let freshness_ok = true
  if (config.maxStaleMonths != null && row.date_refreshed) {
    const dt = new Date(row.date_refreshed)
    if (!Number.isNaN(dt.getTime())) {
      const age = monthsBetween(dt, new Date())
      freshness_ok = age <= config.maxStaleMonths
      if (!freshness_ok) return { reject: 'stale_data', required_fields_ok: true, freshness_ok: false, chain_filtered: false }
    }
  }

  // ---- Strict-vegan name filter ----
  if (config.strictVeganNameFilter) {
    if (!nameHasVegan(name)) {
      return { reject: 'name_lacks_vegan', required_fields_ok: true, freshness_ok, chain_filtered: false }
    }
    if (nameHasVegetarian(name)) {
      return { reject: 'name_mentions_vegetarian', required_fields_ok: true, freshness_ok, chain_filtered: false }
    }
  }

  return { reject: null, required_fields_ok: true, freshness_ok, chain_filtered: false }

  function skip(r: RejectReason, extra: { required: boolean }): QualityGateResult {
    return {
      reject: r,
      required_fields_ok: extra.required ? true : false,
      freshness_ok: true,
      chain_filtered: false,
    }
  }
}
