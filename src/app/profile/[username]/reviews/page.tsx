import { Metadata } from 'next'
import ContributionsView from '@/components/profile/ContributionsView'

export const revalidate = 0

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  return {
    title: `Reviews · @${username} — Plants Pack`,
    description: `Reviews written by @${username} on Plants Pack.`,
    alternates: { canonical: `https://www.plantspack.com/profile/${username}/reviews` },
  }
}

export default async function ProfileReviewsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return (
    <div className="min-h-screen bg-surface">
      <ContributionsView username={username} type="reviews" />
    </div>
  )
}
