import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vegan Events - PlantsPack',
  description: 'Discover upcoming vegan events, meetups, and gatherings near you.',
}

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children
}
