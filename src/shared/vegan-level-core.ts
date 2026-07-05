// Platform-neutral vegan-level definitions shared between web and the mobile
// app. Presentation (Tailwind classes, native colors) stays per-platform —
// this module is the single source for the enum, ordering, labels, and the
// city-score weights (which must also mirror the SQL CASE in the city_scores
// materialized view).

export type VeganLevel = 'fully_vegan' | 'mostly_vegan' | 'vegan_friendly' | 'vegan_options'

export const VEGAN_LEVEL_ORDER: Record<string, number> = {
  fully_vegan: 3,
  mostly_vegan: 2,
  vegan_friendly: 1,
  vegan_options: 0,
}

export const VEGAN_LEVEL_LABEL: Record<string, string> = {
  fully_vegan: '100% Vegan',
  mostly_vegan: 'Mostly Vegan',
  vegan_friendly: 'Vegan-Friendly',
  vegan_options: 'Has Vegan Options',
}

export const VEGAN_LEVEL_SHORT: Record<string, string> = {
  fully_vegan: '100% Vegan',
  mostly_vegan: 'Mostly Vegan',
  vegan_friendly: 'Vegan-Friendly',
  vegan_options: 'Vegan Options',
}

// City scoring weights (mirrors SQL CASE in city_scores materialized view)
export const VEGAN_LEVEL_WEIGHT: Record<string, number> = {
  fully_vegan: 1.00,
  mostly_vegan: 0.70,
  vegan_friendly: 0.35,
  vegan_options: 0.10,
}

export function veganLevelOrder(level: string | null | undefined): number {
  return VEGAN_LEVEL_ORDER[level ?? ''] ?? -1
}
