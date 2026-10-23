'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'

/** Back link from one place's dashboard: owners go to their places, admins to the owners overview. */
export default function DashboardBackLink() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  return (
    <Link href={isAdmin ? '/admin/business' : '/business/dashboard'} className="text-sm font-medium text-primary hover:underline">
      &larr; {isAdmin ? 'All business owners' : 'All your places'}
    </Link>
  )
}
