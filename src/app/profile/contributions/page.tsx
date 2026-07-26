import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import ContributionsClient from '@/components/profile/ContributionsClient'
import SupportNudge from '@/components/support/SupportNudge'

export const revalidate = 0

export const metadata: Metadata = {
  title: 'My Contributions — Plants Pack',
  description: 'Manage the places, reviews and posts you\u2019ve contributed.',
}

export default async function ContributionsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth?redirect=/profile/contributions')

  return (
    <div className="min-h-screen bg-surface">
      {/* Contributors land here from the "your suggestion is live" notification —
          the one moment they've just been reminded they built part of this. */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <SupportNudge placement="contributions" variant="contributor" />
      </div>
      <ContributionsClient userId={session.user.id} />
    </div>
  )
}
