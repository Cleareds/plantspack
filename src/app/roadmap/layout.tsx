import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PlantsPack Roadmap — Upcoming Features & Community Voting | PlantsPack',
  description: 'See what is being built next on PlantsPack. Upcoming features, planned improvements, and community-voted priorities. Supporters can vote on what ships next.',
  alternates: { canonical: 'https://plantspack.com/roadmap' },
  openGraph: {
    title: 'PlantsPack Roadmap',
    description: 'Upcoming features and community-voted priorities for the PlantsPack vegan platform.',
    type: 'website',
    siteName: 'PlantsPack',
  },
}

export default function RoadmapLayout({ children }: { children: React.ReactNode }) {
  return children
}
