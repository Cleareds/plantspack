// Country event hub — /events/[country]. Captures "vegan festivals {country}" /
// "vegan events {country}" geo-intent queries, carries ItemList + Event schema,
// and cross-links to the vegan-places directory (events ↔ directory mesh).
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, MapPin } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildBreadcrumbs, HOME_CRUMB } from '@/lib/schema/breadcrumbs'
import { slugifyCityOrCountry } from '@/lib/places/slugify'
import { OG_DEFAULT_IMAGES } from '@/lib/og'
import EventCard from '@/components/events/EventCard'
import { eventSchemaDates, eventSchemaDescription, eventSchemaOrganizer } from '@/lib/events/event-schema-dates'

export const revalidate = 3600

type RouteParams = { country: string }

async function loadCountryEvents(countrySlug: string) {
  const sb = createAdminClient()
  const nowIso = new Date().toISOString()
  // Small dataset — fetch upcoming public events and match the country slug in
  // JS (event_data.country isn't slug-indexable in SQL).
  const { data } = await sb
    .from('posts')
    .select('id, title, slug, content, images, image_url, event_data, users(id, username, first_name, last_name, avatar_url)')
    .eq('category', 'event')
    .eq('privacy', 'public')
    .gte('event_data->>start_time', nowIso)
    .order('event_data->>start_time', { ascending: true })
    .limit(500)
  const events = (data || []).filter(p => {
    const c = (p.event_data as { country?: string } | null)?.country
    return c && slugifyCityOrCountry(c) === countrySlug
  })
  const country = (events[0]?.event_data as { country?: string } | null)?.country || null
  return { country, events }
}

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { country: slug } = await params
  const { country, events } = await loadCountryEvents(slug)
  if (!country || events.length === 0) return { title: 'Vegan events', robots: { index: false } }
  const title = `Vegan Events & Festivals in ${country} (2026) | Plants Pack`
  const description = `${events.length} upcoming vegan festival${events.length === 1 ? '' : 's'} and plant-based event${events.length === 1 ? '' : 's'} in ${country} — dates, locations, and tickets. Updated regularly.`
  return {
    title,
    description,
    alternates: { canonical: `https://www.plantspack.com/events/${slug}` },
    openGraph: { title, description, type: 'website', url: `https://www.plantspack.com/events/${slug}`, siteName: 'Plants Pack', images: OG_DEFAULT_IMAGES },
  }
}

export default async function CountryEventsPage({ params }: { params: Promise<RouteParams> }) {
  const { country: slug } = await params
  const { country, events } = await loadCountryEvents(slug)
  if (!country || events.length === 0) notFound()

  const dirHref = `/vegan-places/${slug}`
  const ldItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Vegan events & festivals in ${country}`,
    numberOfItems: events.length,
    itemListElement: events.slice(0, 50).map((p, i) => {
      const ed = (p.event_data || {}) as Record<string, string | undefined>
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Event',
          name: p.title || ed.title || (p.content || '').split('\n')[0].slice(0, 90),
          url: `https://www.plantspack.com/event/${p.slug || p.id}`,
          ...(eventSchemaDates(ed) || {}),
          ...(ed.location ? { location: { '@type': 'Place', name: ed.location, address: { '@type': 'PostalAddress', addressCountry: country, ...(ed.city ? { addressLocality: ed.city } : {}) } } } : {}),
          description: eventSchemaDescription(p.content, p.title || ed.title),
          organizer: eventSchemaOrganizer((p as { users?: unknown }).users as Parameters<typeof eventSchemaOrganizer>[0]),
        },
      }
    }),
  }
  const ldBreadcrumbs = buildBreadcrumbs([
    HOME_CRUMB,
    { name: 'Events', url: 'https://www.plantspack.com/events' },
    { name: country, url: `https://www.plantspack.com/events/${slug}` },
  ])

  return (
    <div className="min-h-screen bg-surface-container-low">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldItemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumbs) }} />

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <nav className="text-sm text-on-surface-variant mb-4 flex items-center gap-1 flex-wrap">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span>›</span>
          <Link href="/events" className="hover:text-primary">Events</Link>
          <span>›</span>
          <span className="font-medium text-on-surface">{country}</span>
        </nav>

        <h1 className="font-headline font-extrabold text-3xl md:text-4xl tracking-tight mb-2">
          Vegan Events & Festivals in {country}
        </h1>
        <p className="text-on-surface-variant text-base mb-2 leading-relaxed max-w-3xl">
          {events.length} upcoming vegan festival{events.length === 1 ? '' : 's'} and plant-based event{events.length === 1 ? '' : 's'} across {country} — with dates, locations, and ticket links.
        </p>
        <Link href={dirHref} className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline mb-6">
          <MapPin className="h-4 w-4" /> Browse vegan places in {country} →
        </Link>

        <div className="space-y-3">
          {events.map(e => (
            <EventCard key={e.id} event={e as unknown as Parameters<typeof EventCard>[0]['event']} />
          ))}
        </div>

        <div className="border-t border-outline-variant/20 mt-8 pt-6">
          <Link href="/events" className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
            <ChevronLeft className="h-4 w-4" /> All vegan events worldwide
          </Link>
        </div>
      </div>
    </div>
  )
}
