import { Metadata } from 'next'
import { Suspense } from 'react'
import CityRanksTable from '@/components/vegan-score/CityRanksTable'

export const metadata: Metadata = {
  title: 'City Ranks — Most Vegan-Friendly Cities | PlantsPack',
  description: 'Discover the most vegan-friendly cities worldwide. See rankings, scores, and contribute to improve your city.',
  alternates: { canonical: 'https://plantspack.com/vegan-score' },
}

export default function VeganScorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <CityRanksTable />
    </Suspense>
  )
}
