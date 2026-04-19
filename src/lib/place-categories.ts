/**
 * Category metadata, safe to import in both server and client code.
 *
 * Kept in its own file (no `import L from 'leaflet'`) so non-map
 * components (e.g. MapLegend) can read it without pulling in Leaflet,
 * which references `window` at module load and breaks SSR.
 */
export const CATEGORY_CONFIG: Record<string, { color: string; emoji: string; label: string }> = {
  eat: { color: '#22c55e', emoji: '🌿', label: 'Eat' },
  hotel: { color: '#3b82f6', emoji: '🛏️', label: 'Stay' },
  store: { color: '#a855f7', emoji: '🛍️', label: 'Store' },
  organisation: { color: '#f97316', emoji: '🐾', label: 'Sanctuary' },
  event: { color: '#ec4899', emoji: '🎉', label: 'Event' },
  other: { color: '#6b7280', emoji: '📍', label: 'Other' },
}
