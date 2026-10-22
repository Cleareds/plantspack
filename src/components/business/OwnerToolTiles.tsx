'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, UtensilsCrossed } from 'lucide-react'
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
      <StatsTile place={place} />
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

// Page views are counted since 30 July 2026 (content_view_daily); Google
// numbers are one cumulative backfill, shown only with their period and only
// from 10 impressions up, the same rule as the contributor impact view.
const MIN_SEARCH_IMPRESSIONS = 10

interface Stats {
  views30: number
  viewsPrev30: number
  saves: number
  google: { impressions: number; clicks: number; from: string | null; to: string | null } | null
}

function StatsTile({ place }: { place: OwnedPlace }) {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => {
    const sb = supabase as any
    const day = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)
    Promise.all([
      sb.from('content_view_daily').select('day, views').eq('entity_type', 'place').eq('entity_id', place.id).gte('day', day(60)),
      sb.from('favorite_places').select('id', { count: 'exact', head: true }).eq('place_id', place.id),
      sb.from('place_search_stats').select('clicks, impressions, period_start, period_end').eq('place_id', place.id).maybeSingle(),
    ]).then(([v, f, g]: any[]) => {
      const cut = day(30)
      let views30 = 0
      let viewsPrev30 = 0
      for (const r of v.data || []) {
        if (r.day >= cut) views30 += r.views
        else viewsPrev30 += r.views
      }
      const gs = g.data
      setStats({
        views30,
        viewsPrev30,
        saves: f.count ?? 0,
        google: gs && gs.impressions >= MIN_SEARCH_IMPRESSIONS
          ? { impressions: gs.impressions, clicks: gs.clicks, from: gs.period_start, to: gs.period_end }
          : null,
      })
    }).catch(() => setStats(null))
  }, [place.id])

  const month = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '')

  return (
    <div className="p-4 rounded-xl ghost-border">
      <div className="flex items-center gap-2 font-semibold text-on-surface">
        <BarChart3 className="h-4 w-4 text-primary" />
        Your numbers
      </div>
      {stats ? (
        <ul className="text-sm text-on-surface-variant mt-1 space-y-0.5">
          <li><span className="font-semibold text-on-surface">{stats.views30.toLocaleString()}</span> page views in the last 30 days ({stats.viewsPrev30.toLocaleString()} the 30 days before)</li>
          <li><span className="font-semibold text-on-surface">{stats.saves.toLocaleString()}</span> people saved your place</li>
          {stats.google && (
            <li>
              <span className="font-semibold text-on-surface">{stats.google.impressions.toLocaleString()}</span> Google search appearances, {stats.google.clicks.toLocaleString()} clicks ({month(stats.google.from)} to {month(stats.google.to)})
            </li>
          )}
        </ul>
      ) : (
        <p className="text-sm text-on-surface-variant mt-1">Loading...</p>
      )}
    </div>
  )
}
