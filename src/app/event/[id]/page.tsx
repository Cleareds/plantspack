import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Ticket, ExternalLink } from 'lucide-react'
import ImageSlider from '@/components/ui/ImageSlider'
import InlineComments from '@/components/posts/InlineComments'
import EventResponseButtons from '@/components/events/EventResponseButtons'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'
import { createAdminClient } from '@/lib/supabase-admin'
import { slugifyCityOrCountry } from '@/lib/places/slugify'
import { VEGAN_LEVEL_LABEL } from '@/lib/vegan-level'
import { eventSchemaDates } from '@/lib/events/event-schema-dates'

// Static shell revalidates every 10 minutes. Comments and the Going/Interested
// buttons are client components that fetch live data on mount, so this does
// not stale the interactive parts of the page. Required to fix LCP — the
// previous `revalidate = 0` re-rendered on every request and skipped the edge
// cache entirely.
export const revalidate = 600

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
    is_free?: boolean
    city?: string
    country?: string
    time_tbd?: boolean
    latitude?: number
    longitude?: number
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
  // Direct Supabase query, no self-HTTP roundtrip. Saves 100-400ms of TTFB
  // (previous version hit our own /api/posts/[id] Vercel function from the
  // server component, doubling the request chain on every render).
  const sb = createAdminClient()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  let query = sb
    .from('posts')
    .select(`
      id, title, slug, content, category, images, image_url, event_data, created_at,
      users (id, username, first_name, last_name, avatar_url)
    `)
    .eq('category', 'event')
  query = isUuid ? query.eq('id', id) : query.eq('slug', id)
  const { data } = await query.maybeSingle()
  return (data as unknown as EventPost) ?? null
}

type NearbyPlace = {
  id: string; slug: string | null; name: string; vegan_level: string | null
  category: string | null; main_image_url: string | null; address: string | null
}

/**
 * Vegan places in the event's city — turns event traffic into directory
 * discovery and passes internal-link equity from well-ranking event pages to
 * the directory city/cuisine pages (the events→directory synergy). Ranked by
 * verification then rating so the strongest spots surface first.
 */
async function getCityVeganPlaces(city?: string, country?: string): Promise<{ places: NearbyPlace[]; total: number }> {
  if (!city || !country) return { places: [], total: 0 }
  const sb = createAdminClient()
  const { data, count } = await sb
    .from('places')
    .select('id, slug, name, vegan_level, category, main_image_url, address', { count: 'exact' })
    .ilike('country', country)
    .ilike('city', city)
    .is('archived_at', null)
    .order('is_verified', { ascending: false })
    .order('verification_level', { ascending: false, nullsFirst: false })
    .order('review_count', { ascending: false, nullsFirst: false })
    .limit(6)
  return { places: (data as NearbyPlace[]) || [], total: count || 0 }
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
  // Noindex events that ended well in the past (>21 days): Google only surfaces
  // future events, and a stale "past event" page indexed as live is low-value.
  // We don't 404 it (keeps any link equity) — just drop it from the index.
  const endIso = event?.end_time || event?.start_time
  const wellPast = endIso ? (Date.now() - new Date(endIso).getTime()) > 21 * 864e5 : false
  return {
    title: `${title} - Event | PlantsPack`,
    description,
    alternates: { canonical: `https://www.plantspack.com/event/${post.slug || id}` },
    ...(wellPast ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title, description, type: 'article', siteName: 'PlantsPack', ...(image ? { images: [image] } : {}) },
  }
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getEventPost(id)
  if (!post) notFound()

  // UUID → slug redirect for canonical URLs in GSC.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  if (isUuid && post.slug) {
    const { redirect } = await import('next/navigation')
    redirect(`/event/${post.slug}`)
  }

  const images = post.images?.length ? post.images : post.image_url ? [post.image_url] : []
  const event = post.event_data
  const { places: cityPlaces, total: cityTotal } = await getCityVeganPlaces(event?.city, event?.country)
  const citySlug = event?.city ? slugifyCityOrCountry(event.city) : null
  const countrySlug = event?.country ? slugifyCityOrCountry(event.country) : null
  const cityDirHref = countrySlug && citySlug ? `/vegan-places/${countrySlug}/${citySlug}` : null
  const displayName = post.users.first_name
    ? `${post.users.first_name} ${post.users.last_name || ''}`.trim()
    : post.users.username

  const eventTitle = post.title || post.content.split('\n')[0].substring(0, 80)

  return (
    <div className="min-h-screen bg-surface-container-low">
      {/* LCP image preload — the slider is a client component, so without this
          the browser only discovers the hero image after JS hydrates. Preload
          fires the request from the document head, parallel to the JS bundle. */}
      {images[0] && (
        // eslint-disable-next-line @next/next/no-head-element
        <link rel="preload" as="image" href={images[0]} fetchPriority="high" />
      )}
      {/* Event JSON-LD */}
      {event?.start_time && (() => {
        const eventUrl = `https://www.plantspack.com/event/${post.slug || post.id}`
        const organizerUrl = `https://www.plantspack.com/profile/${post.users.username}`
        const fallbackImage = 'https://www.plantspack.com/og-default.png'
        const organizer = {
          '@type': 'Organization',
          name: displayName,
          url: organizerUrl,
        }
        return (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: eventTitle,
            // Date-only when we only know the day (avoids advertising a fake
            // time); full datetime (with the source's offset) otherwise. endDate
            // always emitted (falls back to start for single-day events).
            ...(eventSchemaDates(event) || {}),
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            ...(event.location
              ? {
                  location: {
                    '@type': 'Place',
                    name: event.location,
                    // PostalAddress is what makes an event eligible for Google's
                    // event rich results; geo added now that events are geocoded.
                    address: {
                      '@type': 'PostalAddress',
                      ...(event.location ? { streetAddress: event.location } : {}),
                      ...(event.city ? { addressLocality: event.city } : {}),
                      ...(event.country ? { addressCountry: event.country } : {}),
                    },
                    ...(event.latitude != null && event.longitude != null
                      ? { geo: { '@type': 'GeoCoordinates', latitude: event.latitude, longitude: event.longitude } }
                      : {}),
                  },
                }
              : {}),
            description: post.content.substring(0, 300),
            image: [images[0] || fallbackImage],
            organizer,
            performer: organizer,
            ...(event.is_free
              ? { offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url: event.ticket_url || eventUrl } }
              : event.ticket_url
                ? { offers: { '@type': 'Offer', url: event.ticket_url, availability: 'https://schema.org/InStock' } }
                : {}),
            url: event.ticket_url || eventUrl,
          }) }} />
        )
      })()}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        buildBreadcrumbs([
          HOME_CRUMB,
          { name: 'Events', url: 'https://www.plantspack.com/events' },
          ...(event?.country && countrySlug
            ? [{ name: event.country, url: `https://www.plantspack.com/events/${countrySlug}` }]
            : []),
          { name: eventTitle, url: `https://www.plantspack.com/event/${post.slug || post.id}` },
        ])
      ) }} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span className="text-outline">/</span>
          <Link href="/events" className="hover:text-primary transition-colors">Events</Link>
          <span className="text-outline">/</span>
          {event?.country && countrySlug && (
            <>
              <Link href={`/events/${countrySlug}`} className="hover:text-primary transition-colors">{event.country}</Link>
              <span className="text-outline">/</span>
            </>
          )}
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
                    {!event.time_tbd && (
                      <div className="text-sm text-on-surface-variant mt-0.5">
                        {new Date(event.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        {event.end_time && ` – ${new Date(event.end_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    )}
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
              <Link href={`/profile/${post.users.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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

        {/* Vegan places in this event's city — events → directory bridge */}
        {cityPlaces.length > 0 && cityDirHref && (
          <div className="mt-6 bg-surface-container-lowest rounded-2xl editorial-shadow p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-lg font-semibold text-on-surface">
                Vegan places in {event?.city}
              </h2>
              <Link href={cityDirHref} className="text-sm text-primary font-medium hover:underline whitespace-nowrap">
                See all {cityTotal} →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cityPlaces.map(pl => (
                <Link
                  key={pl.id}
                  href={`/place/${pl.slug || pl.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl ghost-border hover:bg-surface-container-low transition-colors"
                >
                  {pl.main_image_url ? (
                    <img src={pl.main_image_url} alt={pl.name} className="h-12 w-12 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-on-surface-variant" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-on-surface truncate">{pl.name}</div>
                    <div className="text-xs text-on-surface-variant truncate">
                      {pl.vegan_level ? (VEGAN_LEVEL_LABEL[pl.vegan_level] ?? pl.vegan_level) : pl.address}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <p className="text-xs text-on-surface-variant mt-4">
              Heading to {event?.city} for this event? Discover{' '}
              <Link href={cityDirHref} className="text-primary hover:underline">all {cityTotal} vegan spots in {event?.city}</Link>
              {countrySlug && citySlug && (
                <>
                  {' '}or browse{' '}
                  <Link href={`${cityDirHref}/best-vegan`} className="text-primary hover:underline">guides by dish</Link>
                </>
              )}.
            </p>
          </div>
        )}

        <div className="mt-6 bg-surface-container-lowest rounded-2xl editorial-shadow p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Comments</h2>
          <InlineComments postId={post.id} />
        </div>
      </div>
    </div>
  )
}
