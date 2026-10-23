import { Metadata } from 'next'
import ToolPageShell from '@/components/business/ToolPageShell'
import EventsManager from '@/components/business/EventsManager'

export const metadata: Metadata = {
  title: 'Events | PlantsPack for Business',
  robots: { index: false, follow: false },
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <ToolPageShell placeId={id}>
      <EventsManager placeId={id} />
    </ToolPageShell>
  )
}
