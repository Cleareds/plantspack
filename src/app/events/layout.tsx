import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-admin'
import { slugifyCityOrCountry } from '@/lib/places/slugify'

// The /events page is a client component (interactive search/calendar), so it
// can't server-render schema. This layout adds a server-rendered ItemList of
// upcoming events to the initial HTML so crawlers see it and the page is
// eligible for Google's event experience. Metadata stays here too.

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Vegan Events Near You — Meetups, Festivals & Potlucks | PlantsPack',
  description: 'Find upcoming vegan events, meetups, potlucks, and festivals posted by the community. Filter by city, category, and date. Free to join, free to post your own event.',
  alternates: { canonical: 'https://www.plantspack.com/events' },
  openGraph: {
    title: 'Vegan Events Near You — Festivals, Meetups & Potlucks | PlantsPack',
    description: 'Upcoming vegan festivals and plant-based events worldwide — dates, locations, and tickets.',
    type: 'website',
    url: 'https://www.plantspack.com/events',
    siteName: 'PlantsPack',
  },
}

async function upcomingEventsSchema() {
  try {
    const sb = createAdminClient()
    const nowIso = new Date().toISOString()
    const { data } = await sb
      .from('posts')
      .select('slug, id, title, content, images, image_url, event_data')
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
        ...(ed.start_time ? { startDate: ed.start_time } : {}),
        ...(ed.end_time ? { endDate: ed.end_time } : {}),
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        ...(ed.location ? { location: { '@type': 'Place', name: ed.location, address: ed.location } } : {}),
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
        <nav aria-label="Vegan events by country" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h2 className="text-sm font-semibold text-on-surface-variant mb-3">Browse vegan events by country</h2>
          <div className="flex flex-wrap gap-2">
            {countries.map(c => (
              <Link
                key={c.slug}
                href={`/events/${c.slug}`}
                className="px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-sm font-medium text-on-surface transition-colors"
              >
                {c.name} <span className="text-on-surface-variant">({c.count})</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  )
}
