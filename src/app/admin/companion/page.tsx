import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import CompanionClient from '@/components/companion/CompanionClient'

const ADMIN_ID = 'd27f7c5e-2053-4c0c-8fd1-27ee3269ad1c'

// POC: not for production rollout yet. noindex/nofollow ensures search
// engines never surface it, even if the route URL leaks. Sitemap also
// excludes /admin/* by convention.
export const metadata: Metadata = {
  title: 'Companion — Admin POC',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export const dynamic = 'force-dynamic'

export default async function CompanionPage() {
  // Hard gate: only the admin user can render this route. Non-admin users
  // (signed-in or not) get a 404, indistinguishable from "doesn't exist".
  // No redirect to /auth — we don't want this to look like a real feature.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== ADMIN_ID) {
    notFound()
  }

  return <CompanionClient />
}
