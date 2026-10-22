import { Metadata } from 'next'
import ToolPageShell from '@/components/business/ToolPageShell'
import Insights from '@/components/business/Insights'

export const metadata: Metadata = {
  title: 'Detailed stats | PlantsPack for Business',
  robots: { index: false, follow: false },
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <ToolPageShell placeId={id}>
      <Insights placeId={id} />
    </ToolPageShell>
  )
}
