'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@/lib/auth'
import { BUSINESS_TOOLS_PUBLIC } from '@/lib/business/launch'

/**
 * Renders children when the business tools are public, or for an admin while
 * they are in preview. Everyone else gets the fallback (default: nothing).
 * Client-side, so cached ISR pages stay cached.
 */
export default function AdminPreviewGate({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { profile, loading } = useAuth()
  if (BUSINESS_TOOLS_PUBLIC) return <>{children}</>
  if (loading) return null
  return profile?.role === 'admin' ? <>{children}</> : <>{fallback}</>
}

export function useBusinessToolsVisible(): boolean {
  const { profile } = useAuth()
  return BUSINESS_TOOLS_PUBLIC || profile?.role === 'admin'
}
