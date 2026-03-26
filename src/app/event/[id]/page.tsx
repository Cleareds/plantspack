import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Ticket, ExternalLink } from 'lucide-react'
import ImageSlider from '@/components/ui/ImageSlider'
import InlineComments from '@/components/posts/InlineComments'
import EventResponseButtons from '@/components/events/EventResponseButtons'

type EventPost = {
  id: string
  title?: string | null
  slug?: string | null
  content: string
  category: string
  images?: string[] | null
  image_url?: string | null
  event_data?: {
    start_time?: string
    end_time?: string
    location?: string
    ticket_url?: string
    is_recurring?: boolean
  } | null
  created_at: string
  users: {
    id: string
    username: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  }
}

async function getEventPost(id: string): Promise<EventPost | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plantspack.com'
    const response = await fetch(`${baseUrl}/api/posts/${id}`, {
      next: { revalidate: 60 },
    })
    if (!response.ok) return null
    const data = await response.json()
    if (data.post?.category !== 'event') return null
    return data.post
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const post = await getEventPost(id)
  if (!post) return { title: 'Event Not Found - PlantsPack' }

  const title = post.content.split('\n')[0].substring(0, 80)
  const event = post.event_data
  const description = event?.start_time
    ? `${new Date(event.start_time).toLocaleDateString()} · ${event.location || ''}`
    : post.content.substring(0, 160)

  const image = post.images?.[0] || post.image_url
  return {
    title: `${title} - Event | PlantsPack`,
    description,
    alternates: { canonical: `https://plantspack.com/event/${id}` },
    openGraph: { title, description, type: 'article', siteName: 'PlantsPack', ...(image ? { images: [image] } : {}) },
  }
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getEventPost(id)
  if (!post) notFound()

  const images = post.images?.length ? post.images : post.image_url ? [post.image_url] : []
  const event = post.event_data
  const displayName = post.users.first_name
    ? `${post.users.first_name} ${post.users.last_name || ''}`.trim()
    : post.users.username

  const eventTitle = post.title || post.content.split('\n')[0].substring(0, 80)

  return (
    <div className="min-h-screen bg-surface-container-low">
      {/* Event JSON-LD */}
      {event?.start_time && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: eventTitle,
          startDate: event.start_time,
          ...(event.end_time ? { endDate: event.end_time } : {}),
          ...(event.location ? { location: { '@type': 'Place', name: event.location } } : {}),
          ...(event.ticket_url ? { offers: { '@type': 'Offer', url: event.ticket_url } } : {}),
          description: post.content.substring(0, 300),
          organizer: { '@type': 'Person', name: displayName },
          ...(images[0] ? { image: images[0] } : {}),
        }) }} />
      )}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="text-outline">/</span>
          <Link href="/events" className="hover:text-primary transition-colors">Events</Link>
          <span className="text-outline">/</span>
          <span className="text-on-surface font-medium truncate max-w-[200px]">{post.title || post.content.split('\n')[0].substring(0, 40)}</span>
        </nav>

        <div className="bg-surface-container-lowest rounded-2xl editorial-shadow overflow-hidden">
          {images.length > 0 && (
            <div className="w-full">
              <ImageSlider images={images} aspectRatio="wide" />
            </div>
          )}

          <div className="p-6">
            <h1 className="text-2xl font-bold text-on-surface mb-4">
              {post.content.split('\n')[0]}
            </h1>

            {/* Date/time block */}
            {event?.start_time && (
              <div className="mb-6 p-4 bg-tertiary-container/10 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-14 h-14 bg-tertiary/10 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-tertiary uppercase">
                      {new Date(event.start_time).toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span className="text-xl font-bold text-on-surface leading-none">
                      {new Date(event.start_time).getDate()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-on-surface">
                      {new Date(event.start_time).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-sm text-on-surface-variant mt-0.5">
                      {new Date(event.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      {event.end_time && ` – ${new Date(event.end_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Location */}
            {event?.location && (
              <div className="mb-6 flex items-center gap-2 text-on-surface-variant">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{event.location}</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                >
                  <ExternalLink className="h-3 w-3" />
                  Map
                </a>
              </div>
            )}

            {/* Ticket CTA */}
            {event?.ticket_url && (
              <div className="mb-6">
                <a
                  href={event.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-tertiary text-on-primary rounded-full font-medium hover:opacity-90 transition-opacity"
                >
                  <Ticket className="h-4 w-4" />
                  Get Tickets
                </a>
              </div>
            )}

            {/* Interested / Going buttons */}
            <div className="mb-6">
              <EventResponseButtons postId={post.id} />
            </div>

            {/* Content body */}
            {post.content.split('\n').length > 1 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-on-surface mb-3">Details</h2>
                <div className="text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                  {post.content.split('\n').slice(1).join('\n').trim()}
                </div>
              </div>
            )}

            {/* Author card */}
            <div className="pt-4 border-t border-outline-variant/15">
              <Link href={`/user/${post.users.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                {post.users.avatar_url ? (
                  <img src={post.users.avatar_url} alt={displayName} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-on-primary font-medium text-sm">{displayName[0].toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <div className="font-medium text-sm text-on-surface">{displayName}</div>
                  <div className="text-xs text-on-surface-variant">@{post.users.username}</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-surface-container-lowest rounded-2xl editorial-shadow p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Comments</h2>
          <InlineComments postId={post.id} />
        </div>
      </div>
    </div>
  )
}
