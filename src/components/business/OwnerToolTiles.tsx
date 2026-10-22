'use client'

import type { OwnedPlace } from '@/lib/business/owned-places'

/**
 * Tool tiles that each live on their own page or panel (menu, stats, print,
 * website badge). Kept separate from BusinessDashboard so each tool ships
 * on its own without touching the dashboard shell.
 */
export function OwnerToolTiles({ place: _place }: { place: OwnedPlace }) {
  return null
}
