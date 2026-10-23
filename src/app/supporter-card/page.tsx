import { Metadata } from 'next'
import SupporterCard from '@/components/support/SupporterCard'

export const metadata: Metadata = {
  title: 'Supporter card | PlantsPack',
  robots: { index: false, follow: false },
}

export default function SupporterCardPage() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-md mx-auto px-4 py-10">
        <SupporterCard />
      </div>
    </div>
  )
}
