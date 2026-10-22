import { Metadata } from 'next'
import ToolPageShell from '@/components/business/ToolPageShell'
import PlanBilling from '@/components/business/PlanBilling'

export const metadata: Metadata = {
  title: 'Plan and billing | PlantsPack for Business',
  robots: { index: false, follow: false },
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <ToolPageShell placeId={id}>
      <PlanBilling placeId={id} />
    </ToolPageShell>
  )
}
