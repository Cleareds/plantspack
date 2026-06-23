import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase-admin'

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

    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Upcoming vegan events & festivals',
      numberOfItems: items.length,
      itemListElement: items,
    }
  } catch (e) {
    console.error('[events/layout] schema build failed', (e as Error)?.message)
    return null
  }
}

export default async function EventsLayout({ children }: { children: React.ReactNode }) {
  const schema = await upcomingEventsSchema()
  return (
    <>
      {schema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      )}
      {children}
    </>
  )
}
