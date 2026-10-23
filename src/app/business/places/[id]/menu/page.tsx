import { Metadata } from 'next'
import Link from 'next/link'
import MenuEditor from '@/components/business/MenuEditor'

export const metadata: Metadata = {
  title: 'Your menu | PlantsPack for Business',
  robots: { index: false, follow: false },
}

export default async function OwnerMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href={`/business/places/${id}`} className="text-sm font-medium text-primary hover:underline">&larr; Back to the dashboard</Link>
        <MenuEditor placeId={id} />
      </div>
    </div>
  )
}
