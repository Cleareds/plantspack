import { Metadata } from 'next'
import DashboardBackLink from '@/components/business/DashboardBackLink'
import PlaceDashboard from '@/components/business/PlaceDashboard'

export const metadata: Metadata = {
  title: 'Place dashboard | PlantsPack for Business',
  robots: { index: false, follow: false },
}

export default async function PlaceDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <DashboardBackLink />
        <div className="mt-4">
          <PlaceDashboard placeId={id} />
        </div>
      </div>
    </div>
  )
}
