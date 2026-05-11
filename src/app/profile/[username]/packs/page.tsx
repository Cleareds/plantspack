import { Metadata } from 'next'
import ContributionsView from '@/components/profile/ContributionsView'

export const revalidate = 0

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  return {
    title: `Packs · @${username} — PlantsPack`,
    description: `Packs created by @${username} on PlantsPack.`,
    alternates: { canonical: `https://www.plantspack.com/profile/${username}/packs` },
  }
}

export default async function ProfilePacksPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return (
    <div className="min-h-screen bg-surface">
      <ContributionsView username={username} type="packs" />
    </div>
  )
}
