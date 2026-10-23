'use client'

import Link from 'next/link'
import { Store, Wrench } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { BUSINESS_TOOLS_PUBLIC } from '@/lib/business/launch'

/**
 * On a place page: "Manage your place" for its verified owner (once the tools
 * are public), and direct links to the owner tools for admins, so every tool
 * can be tested on any place. The check runs in the browser so the page stays
 * ISR.
 */
export default function OwnerManageLink({ ownerUserId, placeId, live = false }: { ownerUserId: string | null | undefined; placeId: string; live?: boolean }) {
  const { user, profile } = useAuth()
  if (!user) return null
  const isOwner = !!ownerUserId && user.id === ownerUserId
  const isAdmin = profile?.role === 'admin'

  if (isOwner && (BUSINESS_TOOLS_PUBLIC || live)) {
    return (
      <Link
        href={`/business/places/${placeId}`}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-on-primary-btn rounded-xl hover:opacity-90 transition-opacity"
      >
        <Store className="h-4 w-4" />
        <span>Manage your place</span>
      </Link>
    )
  }
  if (isAdmin) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-xl border border-dashed border-primary/50 text-primary">
        <Wrench className="h-4 w-4" />
        <span className="font-medium">Owner tools:</span>
        <Link href={`/business/places/${placeId}/menu`} className="underline">Menu</Link>
        <span>·</span>
        <Link href={`/business/places/${placeId}/print`} className="underline">Print</Link>
        <span>·</span>
        <Link href={`/business/places/${placeId}`} className="underline">Dashboard</Link>
      </span>
    )
  }
  return null
}
