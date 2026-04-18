import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vegan Events Near You — Meetups, Festivals & Potlucks | PlantsPack',
  description: 'Find upcoming vegan events, meetups, potlucks, and festivals posted by the community. Filter by city, category, and date. Free to join, free to post your own event.',
  alternates: { canonical: 'https://plantspack.com/events' },
}

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children
}
