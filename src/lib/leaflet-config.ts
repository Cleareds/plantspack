import L from 'leaflet'
// Re-export for back-compat: existing callers import CATEGORY_CONFIG from here.
// New non-map code should prefer `@/lib/place-categories` to avoid pulling in
// Leaflet (which references `window` at module scope and breaks SSR).
export { CATEGORY_CONFIG } from './place-categories'
import { CATEGORY_CONFIG } from './place-categories'

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

// Rounded rating bucket (e.g. 4.3 → "4+", 4.7 → "5", < 3 → null).
// Emits a tiny star-badge overlay on the marker when reviews exist.
function ratingBucket(rating?: number | null, reviewCount?: number | null): string | null {
  if (!reviewCount || reviewCount < 1) return null
  if (rating == null) return null
  if (rating >= 4.75) return '5'
  if (rating >= 4.25) return '4+'
  if (rating >= 3.5) return '4'
  if (rating >= 3.0) return '3+'
  return null
}

// Create a category-colored emoji DivIcon, optionally with a rating badge.
function makeCategoryIcon(
  color: string,
  emoji: string,
  isFullyVegan: boolean,
  rating: string | null,
): L.DivIcon {
  const border = isFullyVegan ? '2.5px solid #fff' : '2.5px solid #fbbf24'
  // Star badge floats top-right. Amber for 4+, emerald for 5.
  const badgeBg = rating === '5' ? '#10b981' : '#f59e0b'
  const badge = rating
    ? `<span style="
        position: absolute; top: -6px; right: -8px;
        min-width: 20px; height: 18px; padding: 0 4px;
        border-radius: 10px; background: ${badgeBg}; color: #fff;
        font-size: 10px; font-weight: 700; line-height: 18px; text-align: center;
        box-shadow: 0 1px 4px rgba(0,0,0,0.35); border: 1.5px solid #fff;
        font-family: system-ui, sans-serif;
        pointer-events: none;
      ">★${rating}</span>`
    : ''
  return new L.DivIcon({
    html: `<div style="
      position: relative;
      width: 32px; height: 32px; border-radius: 50%;
      background: ${color}; border: ${border};
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; line-height: 1;
    ">${emoji}${badge}</div>`,
    className: 'leaflet-category-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  })
}

// Pre-built icons per category + vegan level + rating bucket.
const iconCache: Record<string, L.DivIcon> = {}

export function getCategoryIcon(
  category: string,
  veganLevel?: string | null,
  /** Optional rating numbers — when review_count > 0 we overlay a star badge. */
  rating?: number | null,
  reviewCount?: number | null,
): L.DivIcon {
  const isFullyVegan = veganLevel === 'fully_vegan'
  const bucket = ratingBucket(rating, reviewCount)
  const key = `${category}-${isFullyVegan ? 'fv' : 'vf'}-${bucket ?? 'nr'}`
  if (!iconCache[key]) {
    const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other
    iconCache[key] = makeCategoryIcon(cfg.color, cfg.emoji, isFullyVegan, bucket)
  }
  return iconCache[key]
}

// Green gradient cluster icon (shared between Map and City Ranks)
export function createClusterIcon(cluster: any): L.DivIcon {
  const count = cluster.getChildCount()
  const d = count >= 100 ? 48 : count >= 10 ? 42 : 36
  return new L.DivIcon({
    html: `<div style="
      width: ${d}px; height: ${d}px; border-radius: 50%;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      border: 3px solid #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: ${count >= 100 ? 14 : 13}px;
      font-family: system-ui, sans-serif;
    ">${count}</div>`,
    className: 'leaflet-cluster-icon',
    iconSize: [d, d],
  })
}

// Legacy exports for backward compatibility during migration
export const veganMarkerIcon = new L.Icon({
  iconUrl: '/marker-leaf.svg',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
  shadowUrl: '/leaflet/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
})

export const fullyVeganDivIcon = getCategoryIcon('eat', 'fully_vegan')
export const veganFriendlyDivIcon = getCategoryIcon('eat', 'vegan_friendly')

export function getVeganLevelIcon(veganLevel?: string | null): L.DivIcon {
  return getCategoryIcon('eat', veganLevel)
}
