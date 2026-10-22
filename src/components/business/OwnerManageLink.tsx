'use client'

import Link from 'next/link'
import { Store } from 'lucide-react'
import { useAuth } from '@/lib/auth'

/**
 * Shown on a place page only to its verified owner. The owner id comes from
 * the cached page; the check runs in the browser so the page stays ISR.
 */
export default function OwnerManageLink({ ownerUserId }: { ownerUserId: string | null | undefined }) {
  const { user } = useAuth()
  if (!ownerUserId || user?.id !== ownerUserId) return null
  return (
    <Link
      href="/business/dashboard"
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-on-primary-btn rounded-xl hover:opacity-90 transition-opacity"
    >
      <Store className="h-4 w-4" />
      <span>Manage your place</span>
    </Link>
  )
}
