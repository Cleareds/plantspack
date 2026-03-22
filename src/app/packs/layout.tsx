import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Packs - PlantsPack',
  description: 'Discover and join curated vegan communities and collections on PlantsPack.',
}

export default function PacksLayout({ children }: { children: React.ReactNode }) {
  return children
}
