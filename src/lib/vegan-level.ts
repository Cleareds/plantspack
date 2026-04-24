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

// Overlay badge (on top of images) — only shown for the top 3 tiers
export const VEGAN_LEVEL_OVERLAY_CLASS: Record<string, string> = {
  fully_vegan: 'bg-emerald-600 text-white',
  mostly_vegan: 'bg-teal-600 text-white',
  vegan_friendly: 'bg-amber-500 text-white',
  // vegan_options intentionally omitted — too low-signal for overlay
}

// Inline badge (in list/card views)
export const VEGAN_LEVEL_INLINE_CLASS: Record<string, string> = {
  fully_vegan: 'bg-emerald-100 text-emerald-700',
  mostly_vegan: 'bg-teal-100 text-teal-700',
  vegan_friendly: 'bg-amber-100 text-amber-700',
  vegan_options: 'bg-stone-100 text-stone-600',
}

// Large pill badge (place detail page)
export const VEGAN_LEVEL_PILL_CLASS: Record<string, string> = {
  fully_vegan: 'bg-emerald-100 text-emerald-700',
  mostly_vegan: 'bg-teal-100 text-teal-700',
  vegan_friendly: 'bg-amber-100 text-amber-700',
  vegan_options: 'bg-stone-100 text-stone-600',
}

// Map marker border color
export const VEGAN_LEVEL_BORDER_COLOR: Record<string, string> = {
  fully_vegan: '#ffffff',
  mostly_vegan: '#0d9488',  // teal-600
  vegan_friendly: '#fbbf24', // amber-400
  vegan_options: '#fbbf24',
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
