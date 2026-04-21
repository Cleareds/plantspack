import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import ContributionsClient from '@/components/profile/ContributionsClient'

export const revalidate = 0

export const metadata: Metadata = {
  title: 'My Contributions — PlantsPack',
  description: 'Manage the places, reviews and posts you\u2019ve contributed.',
}

export default async function ContributionsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth?redirect=/profile/contributions')

  return (
    <div className="min-h-screen bg-surface">
      <ContributionsClient userId={session.user.id} />
    </div>
  )
}
