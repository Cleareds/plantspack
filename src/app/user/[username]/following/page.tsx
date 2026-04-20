import { Metadata } from 'next'
import FollowList from '@/components/profile/FollowList'

export const revalidate = 0

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  return {
    title: `Following · @${username} — PlantsPack`,
    description: `People @${username} follows on PlantsPack.`,
  }
}

export default async function FollowingPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return (
    <div className="min-h-screen bg-surface">
      <FollowList username={username} direction="following" />
    </div>
  )
}
