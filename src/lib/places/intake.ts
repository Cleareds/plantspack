/**
 * Unified intake decision engine for all external place sources.
 *
 * Usage:
 *   1. Source adapter produces IntakeRecord[]
 *   2. Caller loads existing-places index via loadPlaceIndex(supabase)
 *   3. For each record: call decideIntake(record, index)
 *   4. Apply the resulting action (link / import / skip)
 *
 * DB-first: external IDs and coord+name matches against our DB happen first,
 * so re-ingesting a source that overlaps our DB costs zero extra API calls.
 */

import { similarityLev, distanceM, neighborGridKeys, toGridKey, isChainName } from './matching'
import { detectCategory, type CategorizeHints, type PlaceCategory } from './categorize'

export interface IntakeRecord {
  /** Human-readable source tag; also used as the places.source column value */
  source: string
  /** Per-source stable id (places.source_id). Used for idempotency. */
  sourceId: string

  /** Per-source structured IDs we store on dedicated columns */
  externalIds?: {
    foursquareId?: string
    vegguideId?: number
    osmRef?: string // e.g. "node:1234567"
    happycowId?: string
  }

  name: string
  latitude: number
  longitude: number
  city?: string | null
  country?: string | null
  address?: string | null
  phone?: string | null
  website?: string | null
  description?: string | null
  veganLevel?: 'fully_vegan' | 'vegan_friendly' | null

  /** Hints for category detection */
  categorize: CategorizeHints

  /** Free-form tags the adapter wants to add */
  tags?: string[]

  /** Raw source payload — stored in the source-specific JSONB column if desired */
  raw?: unknown
}

export interface PlaceIndexRow {
  id: string
  name: string
  latitude: number
  longitude: number
  source: string | null
  sourceId: string | null
  foursquareId: string | null
  vegguideId: number | null
  osmRef: string | null
  happycowId: string | null
  /** Whether is_verified or verification_status is anything but 'unverified' */
  isVerified: boolean
}

export interface PlaceIndex {
  byFoursquare: Map<string, PlaceIndexRow>
  byVegguide: Map<number, PlaceIndexRow>
  byOsmRef: Map<string, PlaceIndexRow>
  byHappycow: Map<string, PlaceIndexRow>
  bySourceKey: Map<string, PlaceIndexRow> // `${source}::${sourceId}`
  /** Spatial grid: 0.01° cells */
  spatialGrid: Map<string, PlaceIndexRow[]>
}

export function createEmptyIndex(): PlaceIndex {
  return {
    byFoursquare: new Map(),
    byVegguide: new Map(),
    byOsmRef: new Map(),
    byHappycow: new Map(),
    bySourceKey: new Map(),
    spatialGrid: new Map(),
  }
}

export function indexRow(index: PlaceIndex, r: PlaceIndexRow): void {
  if (r.foursquareId) index.byFoursquare.set(r.foursquareId, r)
  if (r.vegguideId != null) index.byVegguide.set(r.vegguideId, r)
  if (r.osmRef) index.byOsmRef.set(r.osmRef, r)
  if (r.happycowId) index.byHappycow.set(r.happycowId, r)
  if (r.source && r.sourceId) index.bySourceKey.set(`${r.source}::${r.sourceId}`, r)
  const key = toGridKey(r.latitude, r.longitude)
  const arr = index.spatialGrid.get(key) ?? []
  arr.push(r)
  index.spatialGrid.set(key, arr)
}

export type IntakeAction =
  | { action: 'link'; matchId: string; matchRow: PlaceIndexRow; reason: string; confidence: number; category: PlaceCategory; categorizationNote: string }
  | { action: 'import'; reason: string; confidence: number; category: PlaceCategory; categorizationNote: string }
  | { action: 'skip'; reason: string }

const SIM_LINK_THRESHOLD = 0.80
const DIST_LINK_THRESHOLD = 150 // meters
const EXCLUDED_COUNTRIES = new Set(['russia', 'russian federation'])

export function decideIntake(record: IntakeRecord, index: PlaceIndex): IntakeAction {
  // ---- 0. Hard gates ----
  if (!record.name || record.name.trim().length === 0) {
    return { action: 'skip', reason: 'missing_name' }
  }
  if (record.latitude == null || record.longitude == null) {
    return { action: 'skip', reason: 'missing_coords' }
  }
  if (record.country && EXCLUDED_COUNTRIES.has(record.country.toLowerCase())) {
    return { action: 'skip', reason: 'excluded_country' }
  }
  if (isChainName(record.name)) {
    return { action: 'skip', reason: 'chain_name' }
  }

  // ---- 1. External-ID match (strongest signal) ----
  const ids = record.externalIds ?? {}
  if (ids.foursquareId) {
    const hit = index.byFoursquare.get(ids.foursquareId)
    if (hit) return linkResult(record, hit, 'fsq_id_match', 1.0)
  }
  if (ids.vegguideId != null) {
    const hit = index.byVegguide.get(ids.vegguideId)
    if (hit) return linkResult(record, hit, 'vegguide_id_match', 1.0)
  }
  if (ids.osmRef) {
    const hit = index.byOsmRef.get(ids.osmRef)
    if (hit) return linkResult(record, hit, 'osm_ref_match', 1.0)
  }
  if (ids.happycowId) {
    const hit = index.byHappycow.get(ids.happycowId)
    if (hit) return linkResult(record, hit, 'happycow_id_match', 1.0)
  }

  // ---- 2. Source+source_id idempotency ----
  const sourceKey = `${record.source}::${record.sourceId}`
  const sk = index.bySourceKey.get(sourceKey)
  if (sk) return linkResult(record, sk, 'source_rerun', 1.0)

  // ---- 3. Spatial fuzzy match ----
  let best: { row: PlaceIndexRow; sim: number; dist: number } | null = null
  for (const key of neighborGridKeys(record.latitude, record.longitude)) {
    const cell = index.spatialGrid.get(key)
    if (!cell) continue
    for (const row of cell) {
      const d = distanceM(record.latitude, record.longitude, row.latitude, row.longitude)
      if (d > DIST_LINK_THRESHOLD) continue
      const s = similarityLev(record.name, row.name)
      if (!best || s > best.sim) best = { row, sim: s, dist: d }
    }
  }
  if (best && best.sim >= SIM_LINK_THRESHOLD) {
    return linkResult(record, best.row, `spatial_fuzzy:sim=${best.sim.toFixed(2)}:dist=${best.dist.toFixed(0)}m`, best.sim)
  }

  // ---- 4. New place — pick category + import ----
  const cat = detectCategory(record.categorize)
  return {
    action: 'import',
    reason: 'new_place',
    confidence: cat.confidence,
    category: cat.category,
    categorizationNote: cat.note,
  }
}

function linkResult(record: IntakeRecord, row: PlaceIndexRow, reason: string, confidence: number): IntakeAction {
  const cat = detectCategory(record.categorize)
  return {
    action: 'link',
    matchId: row.id,
    matchRow: row,
    reason,
    confidence,
    category: cat.category,
    categorizationNote: cat.note,
  }
}
