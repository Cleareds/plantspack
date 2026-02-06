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

// Category-specific marker colors
export const categoryIcons: Record<string, L.Icon> = {
  restaurant: new L.Icon({
    iconUrl: '/marker-leaf.svg',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  }),
  cafe: new L.Icon({
    iconUrl: '/marker-leaf.svg',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  }),
  event: new L.Icon({
    iconUrl: '/marker-leaf.svg',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  }),
  other: new L.Icon({
    iconUrl: '/marker-leaf.svg',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  }),
}

export function getMarkerIcon(category?: string): L.Icon {
  if (category && categoryIcons[category]) {
    return categoryIcons[category]
  }
  return veganMarkerIcon
}
