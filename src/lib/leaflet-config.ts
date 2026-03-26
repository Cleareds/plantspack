import L from 'leaflet'

// Fix for default marker icons in Next.js
// This prevents 404 errors for marker-icon.png and marker-shadow.png
delete (L.Icon.Default.prototype as any)._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

// Custom vegan leaf marker icon
export const veganMarkerIcon = new L.Icon({
  iconUrl: '/marker-leaf.svg',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
  shadowUrl: '/leaflet/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
})

// Vegan-level marker icons using divIcon
// Fully vegan: green circle with "V"
export const fullyVeganDivIcon = new L.DivIcon({
  html: `<div style="
    width: 28px; height: 28px; border-radius: 50%;
    background: #2d6a4f; border: 2.5px solid #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 700; font-size: 14px; line-height: 1;
    font-family: system-ui, sans-serif;
  ">V</div>`,
  className: 'leaflet-vegan-marker',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
})

// Vegan-friendly: amber/orange circle with "V"
export const veganFriendlyDivIcon = new L.DivIcon({
  html: `<div style="
    width: 28px; height: 28px; border-radius: 50%;
    background: #e6a817; border: 2.5px solid #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 700; font-size: 14px; line-height: 1;
    font-family: system-ui, sans-serif;
  ">V</div>`,
  className: 'leaflet-vegan-marker',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
})

// Returns the appropriate marker icon based on vegan_level
export function getVeganLevelIcon(veganLevel?: string | null): L.DivIcon {
  if (veganLevel === 'fully_vegan') return fullyVeganDivIcon
  return veganFriendlyDivIcon
}

// Category-specific marker colors (legacy, kept for backward compatibility)
export const categoryIcons: Record<string, L.Icon> = {
  restaurant: veganMarkerIcon,
  cafe: veganMarkerIcon,
  event: veganMarkerIcon,
  other: veganMarkerIcon,
}

export function getMarkerIcon(category?: string): L.Icon {
  if (category && categoryIcons[category]) {
    return categoryIcons[category]
  }
  return veganMarkerIcon
}
