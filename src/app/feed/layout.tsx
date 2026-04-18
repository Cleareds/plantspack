import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vegan Community Feed — Posts, Recipes, Reviews & Events | PlantsPack',
  description: 'Follow the PlantsPack community feed: reviews of vegan restaurants, plant-based recipes, city ranking updates, events, and conversations with thousands of vegans worldwide.',
  alternates: { canonical: 'https://plantspack.com/feed' },
  openGraph: {
    title: 'Vegan Community Feed | PlantsPack',
    description: 'Vegan community posts — reviews, recipes, events, city ranks, and conversations.',
    type: 'website',
    siteName: 'PlantsPack',
  },
}

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return children
}
