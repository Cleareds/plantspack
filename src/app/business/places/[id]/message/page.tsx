import { Metadata } from 'next'
import ToolPageShell from '@/components/business/ToolPageShell'
import FollowerMessage from '@/components/business/FollowerMessage'

export const metadata: Metadata = {
  title: 'Message followers | PlantsPack for Business',
  robots: { index: false, follow: false },
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <ToolPageShell placeId={id}>
      <FollowerMessage placeId={id} />
    </ToolPageShell>
  )
}
