import { Suspense } from 'react'
import Map from '@/components/map/Map'

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
