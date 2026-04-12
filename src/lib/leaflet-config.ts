import L from 'leaflet'

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

// Category marker configuration
export const CATEGORY_CONFIG: Record<string, { color: string; emoji: string; label: string }> = {
  eat: { color: '#22c55e', emoji: '🌿', label: 'Eat' },
  hotel: { color: '#3b82f6', emoji: '🛏️', label: 'Stay' },
  store: { color: '#a855f7', emoji: '🛍️', label: 'Store' },
  organisation: { color: '#f97316', emoji: '🐾', label: 'Sanctuary' },
  event: { color: '#ec4899', emoji: '🎉', label: 'Event' },
  other: { color: '#6b7280', emoji: '📍', label: 'Other' },
}

// Create a category-colored emoji DivIcon
function makeCategoryIcon(color: string, emoji: string, isFullyVegan: boolean): L.DivIcon {
  const border = isFullyVegan ? '2.5px solid #fff' : '2.5px solid #fbbf24'
  return new L.DivIcon({
    html: `<div style="
      width: 32px; height: 32px; border-radius: 50%;
      background: ${color}; border: ${border};
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; line-height: 1;
    ">${emoji}</div>`,
    className: 'leaflet-category-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  })
}

// Pre-built icons per category + vegan level
const iconCache: Record<string, L.DivIcon> = {}

export function getCategoryIcon(category: string, veganLevel?: string | null): L.DivIcon {
  const isFullyVegan = veganLevel === 'fully_vegan'
  const key = `${category}-${isFullyVegan ? 'fv' : 'vf'}`
  if (!iconCache[key]) {
    const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other
    iconCache[key] = makeCategoryIcon(cfg.color, cfg.emoji, isFullyVegan)
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
