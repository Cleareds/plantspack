'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UtensilsCrossed } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { OwnedPlace } from '@/lib/business/owned-places'

/**
 * Tool tiles that each live on their own page or panel (menu, stats, print,
 * website badge). Kept separate from BusinessDashboard so each tool ships
 * on its own without touching the dashboard shell.
 */
export function OwnerToolTiles({ place }: { place: OwnedPlace }) {
  return (
    <>
      <MenuTile place={place} />
    </>
  )
}

function MenuTile({ place }: { place: OwnedPlace }) {
  // Public read only sees published menus, which is exactly what the tile reports.
  const [published, setPublished] = useState<{ count: number; checked_at: string | null } | null | undefined>(undefined)
  useEffect(() => {
    const sb = supabase as any
    Promise.all([
      sb.from('place_menus').select('checked_at').eq('place_id', place.id).maybeSingle(),
      sb.from('place_menu_items').select('id', { count: 'exact', head: true }).eq('place_id', place.id),
    ]).then(([m, c]: any[]) => {
      setPublished(m.data ? { count: c.count ?? 0, checked_at: m.data.checked_at } : null)
    }).catch(() => setPublished(null))
  }, [place.id])

  return (
    <Link href={`/business/places/${place.id}/menu`} className="p-4 rounded-xl ghost-border hover:bg-surface-container-low transition-colors">
      <div className="flex items-center gap-2 font-semibold text-on-surface">
        <UtensilsCrossed className="h-4 w-4 text-primary" />
        Menu
      </div>
      <p className="text-sm text-on-surface-variant mt-1">
        {published
          ? `${published.count} dishes on your page${published.checked_at ? `, checked ${new Date(published.checked_at).toLocaleDateString()}` : ''}. Update it when it changes.`
          : 'Upload a photo or PDF of your menu. We read it, you check it, it shows on your page.'}
      </p>
    </Link>
  )
}
