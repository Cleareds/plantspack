'use client'

import Link from 'next/link'
import { CalendarDays } from 'lucide-react'

export interface PlaceEvent { id: string; title: string | null; content: string; event_data: { start_time?: string; cancelled?: boolean } | null }

/** Upcoming events at this place. Times are checked in the browser because the page is cached. */
export default function PlaceEventsSection({ events }: { events: PlaceEvent[] }) {
  const now = Date.now()
  const upcoming = events
    .filter((e) => e.event_data?.start_time && Date.parse(e.event_data.start_time) >= now && !e.event_data.cancelled)
    .sort((a, b) => (a.event_data!.start_time! < b.event_data!.start_time! ? -1 : 1))
    .slice(0, 5)
  if (!upcoming.length) return null
  return (
    <div id="events" className="p-6 border-b border-outline-variant/15 scroll-mt-20">
      <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2 mb-3">
        <CalendarDays className="h-5 w-5 text-primary" /> Upcoming events here
      </h2>
      <ul className="space-y-2">
        {upcoming.map((e) => (
          <li key={e.id}>
            <Link href={`/event/${e.id}`} className="flex items-baseline justify-between gap-3 rounded-xl ghost-border p-3 hover:bg-surface-container-low">
              <span className="font-medium text-on-surface">{e.title || e.content.slice(0, 80)}</span>
              <span className="text-sm text-on-surface-variant whitespace-nowrap">
                {new Date(e.event_data!.start_time!).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
