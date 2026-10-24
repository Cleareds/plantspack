'use client'

import { useEffect, useState } from 'react'
import { openStatusIn, openLabel, type OpenStatus } from '@/lib/open-now'

/**
 * "Open until 22:00" / "Opens 11:00" next to a place's hours. Computed after
 * mount from the place's own time zone (the page is ISR-cached for a day, so
 * the server cannot know the current time). Unknown formats render nothing:
 * an unparsed string must never read as "closed".
 */
export default function OpenNowBadge({ hours, timeZone, className = '' }: { hours: string | null | undefined; timeZone: string | null | undefined; className?: string }) {
  const [status, setStatus] = useState<OpenStatus | null>(null)
  useEffect(() => {
    if (!hours) return
    const tick = () => setStatus(openStatusIn(hours, timeZone))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [hours, timeZone])
  if (!status || status.state === 'unknown') return null
  const label = openLabel(status)
  if (!label) return null
  const open = status.state === 'open'
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${open ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-on-surface-variant'} ${className}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-emerald-500' : 'bg-outline'}`} />
      {label}
    </span>
  )
}
