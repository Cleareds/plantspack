import { Suspense } from 'react'
import type { Metadata } from 'next'
import Map from '@/components/map/Map'

export const metadata: Metadata = {
  title: 'Vegan Places Map — Restaurants, Stores & Stays Worldwide | PlantsPack',
  description: 'Interactive map of 37,000+ vegan and vegan-friendly places worldwide. Find fully-vegan restaurants, plant-based stores, and vegan-friendly hotels near you or anywhere you travel.',
  alternates: { canonical: 'https://plantspack.com/map' },
  openGraph: {
    title: 'Vegan Places Map | PlantsPack',
    description: 'Explore 37,000+ vegan and vegan-friendly places on an interactive worldwide map. Search by city, filter by category, add your favorites.',
    type: 'website',
    siteName: 'PlantsPack',
  },
}

export default function MapPage() {
  return (
    <div className="h-screen bg-surface-container-low overflow-hidden">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }>
        <Map />
      </Suspense>
    </div>
  )
}
