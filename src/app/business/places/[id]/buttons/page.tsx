import { Metadata } from 'next'
import ToolPageShell from '@/components/business/ToolPageShell'
import ButtonsEditor from '@/components/business/ButtonsEditor'

export const metadata: Metadata = {
  title: 'Booking and order buttons | PlantsPack for Business',
  robots: { index: false, follow: false },
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <ToolPageShell placeId={id}>
      <ButtonsEditor placeId={id} />
    </ToolPageShell>
  )
}
