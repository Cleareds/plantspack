import type { Metadata } from 'next'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Plants Pack Roadmap — Upcoming Features & Community Voting | Plants Pack',
  description: 'See what is being built next on Plants Pack. Upcoming features, planned improvements, and community-voted priorities. Supporters can vote on what ships next.',
  alternates: { canonical: 'https://www.plantspack.com/roadmap' },
  openGraph: {
    title: 'Plants Pack Roadmap',
    description: 'Upcoming features and community-voted priorities for the Plants Pack vegan platform.',
    type: 'website',
    siteName: 'Plants Pack',
    images: OG_DEFAULT_IMAGES,
  },
}

export default function RoadmapLayout({ children }: { children: React.ReactNode }) {
  return children
}
