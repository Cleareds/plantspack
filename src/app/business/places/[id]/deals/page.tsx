import { Metadata } from 'next'
import ToolPageShell from '@/components/business/ToolPageShell'
import DealsManager from '@/components/business/DealsManager'

export const metadata: Metadata = {
  title: 'Deals | PlantsPack for Business',
  robots: { index: false, follow: false },
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <ToolPageShell placeId={id}>
      <DealsManager placeId={id} />
    </ToolPageShell>
  )
}
