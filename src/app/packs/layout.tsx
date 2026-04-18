import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vegan Trip Packs — Curated Collections of Places & Recipes | PlantsPack',
  description: 'Build and share personal vegan trip packs — hand-picked restaurants, stores, stays, and recipes grouped by city, cuisine, or occasion. Free to create and browse.',
  alternates: { canonical: 'https://plantspack.com/packs' },
}

export default function PacksLayout({ children }: { children: React.ReactNode }) {
  return children
}
