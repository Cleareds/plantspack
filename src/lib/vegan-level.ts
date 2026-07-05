// The enum, ordering, labels, and score weights live in src/shared (code
// shared with the mobile app — see src/shared/README.md). Only the web-specific
// presentation (Tailwind classes, map marker colors) stays here.
export {
  VEGAN_LEVEL_ORDER,
  VEGAN_LEVEL_LABEL,
  VEGAN_LEVEL_SHORT,
  VEGAN_LEVEL_WEIGHT,
  veganLevelOrder,
} from '../shared/vegan-level-core'
export type { VeganLevel } from '../shared/vegan-level-core'

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
