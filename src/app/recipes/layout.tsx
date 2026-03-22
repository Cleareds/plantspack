import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vegan Recipes - PlantsPack',
  description: 'Browse delicious vegan recipes shared by the PlantsPack community.',
}

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return children
}
