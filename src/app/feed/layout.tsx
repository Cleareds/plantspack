import type { Metadata } from 'next'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Vegan Community Feed — Posts, Recipes, Reviews & Events | PlantsPack',
  description: 'The PlantsPack community feed: reviews of vegan places, plant-based recipes, events and posts from vegans using the map.',
  alternates: { canonical: 'https://www.plantspack.com/feed' },
  openGraph: {
    title: 'Vegan Community Feed | PlantsPack',
    description: 'Vegan community posts - reviews, recipes, events and conversations.',
    type: 'website',
    siteName: 'PlantsPack',
    images: OG_DEFAULT_IMAGES,
  },
}

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return children
}
