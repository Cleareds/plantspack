import type { Metadata } from 'next'
import { OG_DEFAULT_IMAGES } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Vegan Community Feed — Posts, Recipes, Reviews & Events | Plants Pack',
  description: 'Follow the Plants Pack community feed: reviews of vegan restaurants, plant-based recipes, city ranking updates, events, and conversations with thousands of vegans worldwide.',
  alternates: { canonical: 'https://www.plantspack.com/feed' },
  openGraph: {
    title: 'Vegan Community Feed | Plants Pack',
    description: 'Vegan community posts — reviews, recipes, events, city ranks, and conversations.',
    type: 'website',
    siteName: 'Plants Pack',
    images: OG_DEFAULT_IMAGES,
  },
}

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return children
}
