// Two-axis verification model for places.
//
// Axis 1 - Vegan claim level (existing, see vegan_level column): fully_vegan,
//   mostly_vegan, vegan_friendly, vegan_options.
//
// Axis 2 - Verification confidence (NEW, derived in this file):
//   high       — admin-checked, community-confirmed, or community-added
//   mid        — CLI cross-referenced across multiple vegan-first sources
//   low        — OSM-sourced or generic external import, not yet personally checked
//
// Community-added places (created_by is a real user account, not admin) are
// elevated to the "high" tier per 2026-05-24 directive: a real human chose to
// add this venue, which is a stronger trust signal than an algorithmic
// cross-reference. The bar is intentionally generous - vegan-tech moats are
// built on trusting the community over scraped data.

export const ADMIN_USER_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

export type ConfidenceTier = 'high' | 'mid' | 'low'

export interface ConfidenceBadge {
  tier: ConfidenceTier
  /** Short label for tight space (cards) */
  short: string
  /** Full label for detail page / tooltip header */
  label: string
  /** Lucide icon name */
  icon: 'BadgeCheck' | 'Users' | 'Search' | 'Database'
  /** Tailwind classes for the chip itself */
  chipClass: string
  /** Tailwind classes for the icon */
  iconClass: string
  /** Long explanation for tooltip / methodology page */
  description: string
  /** Optional subcategory for sorting within tier */
  subKind: 'admin_review' | 'community_confirmed' | 'community_added' | 'cross_referenced' | 'osm_sourced' | 'imported'
}

interface PlaceLike {
  is_verified?: boolean | null
  verification_level?: number | null
  verification_method?: string | null
  source?: string | null
  created_by?: string | null
  tags?: string[] | null
}

const COMMUNITY_CONFIRMED_TAGS = new Set([
  'actually_fully_vegan',
  'community_correction_confirmed',
  'community_report:actually_fully_vegan',
])

export function getConfidenceBadge(place: PlaceLike): ConfidenceBadge {
  const m = place.verification_method
  const level = place.verification_level ?? 0
  const tags = place.tags || []

  // Tier 1A: ADMIN-CHECKED - explicit admin click through the UI.
  // is_verified is the UI-only flag (CLI scripts can't set it - see
  // [feedback_verification_claims] in CLAUDE.md memory).
  if (place.is_verified && m === 'admin_review') {
    return {
      tier: 'high',
      short: 'Admin-checked',
      label: 'Admin-checked',
      icon: 'BadgeCheck',
      chipClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-200',
      iconClass: 'text-emerald-600',
      description: 'A Plants Pack admin manually verified this place via the venue\'s own website and cross-referenced the vegan claim. Highest trust level.',
      subKind: 'admin_review',
    }
  }

  // Tier 1B: COMMUNITY-CONFIRMED - is_verified=true via any non-admin route,
  // or has a community-confirmation tag. Real human eyes signed off.
  if (place.is_verified || tags.some(t => COMMUNITY_CONFIRMED_TAGS.has(t))) {
    return {
      tier: 'high',
      short: 'Community-confirmed',
      label: 'Community-confirmed',
      icon: 'Users',
      chipClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      iconClass: 'text-emerald-600',
      description: 'Confirmed through a community correction reviewed and approved by an admin. Community feedback is treated as a strong trust signal on Plants Pack.',
      subKind: 'community_confirmed',
    }
  }

  // Tier 1C: COMMUNITY-ADDED - a real Plants Pack user (not the admin / CLI)
  // chose to add this place. Elevated to high tier per 2026-05-24 directive.
  if (place.created_by && place.created_by !== ADMIN_USER_ID) {
    return {
      tier: 'high',
      short: 'Community-added',
      label: 'Community-added',
      icon: 'Users',
      chipClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      iconClass: 'text-emerald-600',
      description: 'Added to Plants Pack by a member of the community who personally knows this place. We trust community contributions as a strong primary source - a real human bothered to add this venue.',
      subKind: 'community_added',
    }
  }

  // Tier 2: CROSS-REFERENCED - L3 reached via CLI cross-reference logic
  // (HappyCow matching, OSM cross-ref, venue website checks via WebSearch).
  // Honest but not yet human-checked.
  if (level >= 3) {
    return {
      tier: 'mid',
      short: 'Cross-referenced',
      label: 'Cross-referenced across multiple sources',
      icon: 'Search',
      chipClass: 'bg-sky-50 text-sky-800 border-sky-300',
      iconClass: 'text-sky-600',
      description: 'Matched across multiple vegan-first sources (HappyCow, venue\'s own website, OSM tags, press articles). Not yet checked by an admin or confirmed by a community member.',
      subKind: 'cross_referenced',
    }
  }

  // Tier 3A: OSM-SOURCED - explicitly from OpenStreetMap diet:vegan tags
  const source = place.source || ''
  if (/^osm|openstreetmap/i.test(source) || /-osm-|osm-/i.test(source)) {
    return {
      tier: 'low',
      short: 'OSM-sourced',
      label: 'Imported from OpenStreetMap',
      icon: 'Database',
      chipClass: 'bg-slate-50 text-slate-700 border-slate-300',
      iconClass: 'text-slate-500',
      description: 'Imported from OpenStreetMap with a diet:vegan tag. The OSM contributor flagged this place as vegan-aligned, but we haven\'t personally checked it. Community feedback welcome.',
      subKind: 'osm_sourced',
    }
  }

  // Tier 3B: IMPORTED - everything else (VegGuide bulk import, Foursquare,
  // batch tags from CLI scripts without explicit verification, etc.)
  return {
    tier: 'low',
    short: 'External source',
    label: 'Imported from external dataset',
    icon: 'Database',
    chipClass: 'bg-slate-50 text-slate-700 border-slate-300',
    iconClass: 'text-slate-500',
    description: 'Imported from an external vegan dataset. Not yet personally checked by us. Help us confirm or correct it via the "Suggest correction" link.',
    subKind: 'imported',
  }
}

/** Sort places by confidence tier for ranking (high first, then mid, then low) */
export function confidenceTierRank(badge: ConfidenceBadge): number {
  return badge.tier === 'high' ? 0 : badge.tier === 'mid' ? 1 : 2
}
