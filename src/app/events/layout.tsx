import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { slugifyCityOrCountry } from '@/lib/places/slugify'
import { eventSchemaDates, eventSchemaDescription, eventSchemaOrganizer } from '@/lib/events/event-schema-dates'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

// The /events page is a client component (interactive search/calendar), so it
// can't server-render schema. This layout adds a server-rendered ItemList of
// upcoming events to the initial HTML so crawlers see it and the page is
// eligible for Google's event experience. Metadata stays here too.

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Vegan Events Near You — Meetups, Festivals & Potlucks | Plants Pack',
  description: 'Find upcoming vegan events, meetups, potlucks, and festivals posted by the community. Filter by city, category, and date. Free to join, free to post your own event.',
  alternates: { canonical: 'https://www.plantspack.com/events' },
  openGraph: {
    title: 'Vegan Events Near You — Festivals, Meetups & Potlucks | Plants Pack',
    description: 'Upcoming vegan festivals and plant-based events worldwide — dates, locations, and tickets.',
    type: 'website',
    url: 'https://www.plantspack.com/events',
    siteName: 'Plants Pack',
    images: OG_DEFAULT_IMAGES,
  },
}

async function upcomingEventsSchema() {
  try {
    const sb = createAdminClient()
    const nowIso = new Date().toISOString()
    const { data } = await sb
      .from('posts')
      .select('slug, id, title, content, images, image_url, event_data, users(username, first_name, last_name)')
      .eq('category', 'event')
      .eq('privacy', 'public')
      .gte('event_data->>start_time', nowIso)
      .order('event_data->>start_time', { ascending: true })
      .limit(50)
    if (!data?.length) return null

    const items = data.map((p, i) => {
      const ed = (p.event_data || {}) as Record<string, string | undefined>
      const url = `https://www.plantspack.com/event/${p.slug || p.id}`
      const name = p.title || ed.title || (p.content || '').split('\n')[0].slice(0, 90)
      const ev: Record<string, unknown> = {
        '@type': 'Event',
        name,
        url,
        ...(eventSchemaDates(ed) || {}),
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        ...(ed.location ? { location: { '@type': 'Place', name: ed.location, address: ed.location } } : {}),
        description: eventSchemaDescription(p.content, name),
        organizer: eventSchemaOrganizer((p as { users?: unknown }).users as Parameters<typeof eventSchemaOrganizer>[0]),
      }
      const img = (p.images as string[] | null)?.[0] || p.image_url
      if (img) ev.image = [img]
      return { '@type': 'ListItem', position: i + 1, item: ev }
    })

    // Country rollup for the "browse by country" hub links.
    const counts = new Map<string, { name: string; count: number }>()
    for (const p of data) {
      const c = (p.event_data as { country?: string } | null)?.country
      if (!c) continue
      const slug = slugifyCityOrCountry(c)
      if (!slug) continue
      const cur = counts.get(slug) || { name: c, count: 0 }
      cur.count++; counts.set(slug, cur)
    }
    const countries = [...counts.entries()]
      .map(([slug, v]) => ({ slug, ...v }))
      .sort((a, b) => b.count - a.count)

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Upcoming vegan events & festivals',
      numberOfItems: items.length,
      itemListElement: items,
    }
    return { schema, countries }
  } catch (e) {
    console.error('[events/layout] schema build failed', (e as Error)?.message)
    return null
  }
}

export default async function EventsLayout({ children }: { children: React.ReactNode }) {
  const data = await upcomingEventsSchema()
  const countries = data?.countries ?? []
  return (
    <>
      {data?.schema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data.schema) }} />
      )}
      {children}
      {countries.length > 1 && (
        <nav aria-label="Vegan events by country" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-10 pb-16 border-t border-outline-variant/15">
          <div className="flex items-baseline gap-3 mb-1">
            <h2 className="text-xl md:text-2xl font-headline font-bold text-on-surface">
              Vegan events around the world
            </h2>
            <span className="text-sm text-on-surface-variant">{countries.length} countries</span>
          </div>
          <p className="text-sm text-on-surface-variant mb-5">
            Browse upcoming vegan festivals and plant-based events by country.
          </p>
          <div className="flex flex-wrap gap-2">
            {countries.map(c => (
              <Link
                key={c.slug}
                href={`/events/${c.slug}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container-low hover:bg-surface-container ghost-border text-sm font-medium text-on-surface transition-colors"
              >
                {c.name}
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">{c.count}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  )
}
