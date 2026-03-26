'use client'

import Link from 'next/link'
import EventResponseButtons from './EventResponseButtons'

type EventPost = {
  id: string
  title?: string | null
  content: string
  images?: string[] | null
  image_url?: string | null
  event_data?: {
    start_time?: string
    end_time?: string
    location?: string
    ticket_url?: string
  } | null
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
}

export default function EventCard({ event }: { event: EventPost }) {
  const title = event.title || event.content.split('\n')[0].substring(0, 100)
  const data = event.event_data
  const startDate = data?.start_time ? new Date(data.start_time) : null
  const endDate = data?.end_time ? new Date(data.end_time) : null

  return (
    <div className="group flex gap-4 bg-surface-container-lowest rounded-2xl editorial-shadow ghost-border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      {/* Date block */}
      {startDate && (
        <Link href={`/event/${event.id}`} className="flex-shrink-0 w-14 h-14 bg-primary/10 rounded-xl flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-primary uppercase">
            {startDate.toLocaleDateString(undefined, { month: 'short' })}
          </span>
          <span className="text-xl font-bold text-on-surface leading-none">
            {startDate.getDate()}
          </span>
        </Link>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Link href={`/event/${event.id}`}>
          <h3 className="font-semibold text-on-surface text-sm line-clamp-1 mb-1 hover:text-primary transition-colors">{title}</h3>
        </Link>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant mb-2">
          {data?.location && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>location_on</span>
              <span className="truncate max-w-[200px]">{data.location}</span>
            </span>
          )}
          {startDate && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
              {startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              {endDate && ` – ${endDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          )}
        </div>

        <EventResponseButtons postId={event.id} compact />
      </div>

      {/* Ticket button */}
      {data?.ticket_url && (
        <div className="flex-shrink-0 self-center">
          <a href={data.ticket_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-tertiary text-white text-xs font-medium rounded-full hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>confirmation_number</span>
            Tickets
          </a>
        </div>
      )}
    </div>
  )
}
