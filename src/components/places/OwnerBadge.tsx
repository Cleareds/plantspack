'use client'

import Link from 'next/link'
import { Building2, CheckCircle } from 'lucide-react'

interface OwnerBadgeProps {
  placeName: string
  placeId: string
  className?: string
  size?: 'sm' | 'md'
}

export default function OwnerBadge({
  placeName,
  placeId,
  className = '',
  size = 'md'
}: OwnerBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5'
  }

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4'
  }

  return (
    <Link
      href={`/place/${placeId}`}
      className={`inline-flex items-center gap-1.5 bg-surface-container-low ghost-border hover:border-primary text-primary hover:text-primary rounded-full font-medium transition-all hover:editorial-shadow ${sizeClasses[size]} ${className}`}
    >
      <Building2 className={iconSize[size]} />
      <span>{placeName} owner</span>
      <CheckCircle className={`${iconSize[size]} text-primary`} />
    </Link>
  )
}
