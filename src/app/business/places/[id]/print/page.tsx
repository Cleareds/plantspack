import { Metadata } from 'next'
import Link from 'next/link'
import PrintKit from '@/components/business/PrintKit'

export const metadata: Metadata = {
  title: 'Sticker and table card | PlantsPack for Business',
  robots: { index: false, follow: false },
}

export default async function OwnerPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href={`/business/places/${id}`} className="no-print text-sm font-medium text-primary hover:underline">&larr; Back to the dashboard</Link>
        <PrintKit placeId={id} />
      </div>
    </div>
  )
}
