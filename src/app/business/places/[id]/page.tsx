import { Metadata } from 'next'
import Link from 'next/link'
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
        <Link href="/business/dashboard" className="text-sm font-medium text-primary hover:underline">&larr; Business dashboard</Link>
        <div className="mt-4">
          <PlaceDashboard placeId={id} />
        </div>
      </div>
    </div>
  )
}
