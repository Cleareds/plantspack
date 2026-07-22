'use client'

import { Download } from 'lucide-react'
import { useAuth } from '@/lib/auth'

/**
 * Supporter perk: download your Packs as CSV or GPX for offline / on-the-road
 * use. Self-gating — only renders on the viewer's OWN profile when they are a
 * paying supporter (tier medium/premium).
 */
export default function ExportPacksButton({ username }: { username: string }) {
  const { profile } = useAuth()
  const p = profile as { username?: string; subscription_tier?: string } | null
  const isOwn = !!p && p.username === username
  const isSupporter = ['medium', 'premium'].includes(p?.subscription_tier || '')
  if (!isOwn || !isSupporter) return null

  const cls = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ghost-border bg-surface text-sm font-medium text-on-surface hover:border-primary/30 transition-colors'
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 px-4">
      <span className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant">
        <Download className="h-4 w-4" /> Export your packs:
      </span>
      <a href="/api/export/packs?format=csv" className={cls}>CSV</a>
      <a href="/api/export/packs?format=gpx" className={cls}>GPX (maps)</a>
    </div>
  )
}
