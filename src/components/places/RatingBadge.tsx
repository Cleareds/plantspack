'use client'

import { Star } from 'lucide-react'
import Link from 'next/link'
import StarRating from './StarRating'

interface RatingBadgeProps {
  rating?: number | null
  reviewCount?: number | null
  size?: 'xs' | 'sm' | 'md'
  showEmpty?: boolean
  emptyHref?: string
  className?: string
}

/**
 * Compact, consistent rating display used under place titles across the app.
 * - xs: single star + value + "· N" (dense, used on small cards and map popups)
 * - sm/md: full StarRating grid + "(N reviews)"
 * Renders nothing when reviewCount is 0 unless showEmpty is set.
 */
export default function RatingBadge({
  rating,
  reviewCount,
  size = 'sm',
  showEmpty = false,
  emptyHref,
  className = '',
}: RatingBadgeProps) {
  const hasRating = typeof rating === 'number' && rating > 0 && (reviewCount ?? 0) > 0

  if (!hasRating) {
    if (!showEmpty) return null
    const label = 'No reviews yet'
    const cta = emptyHref ? (
      <Link href={emptyHref} className="text-primary hover:underline ml-1">
        Be the first to review
      </Link>
    ) : null
    return (
      <div className={`text-sm text-on-surface-variant ${className}`}>
        <Star className="h-4 w-4 inline-block mr-1 opacity-40" />
        <span>{label}</span>
        {cta}
      </div>
    )
  }

  const count = reviewCount!
  const value = rating!.toFixed(1)

  if (size === 'xs') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-on-surface-variant ${className}`}>
        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
        <span className="font-medium text-on-surface">{value}</span>
        <span className="opacity-60">· {count}</span>
      </span>
    )
  }

  const textClass = size === 'md' ? 'text-sm' : 'text-xs'
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <StarRating rating={rating!} size={size} showValue />
      <span className={`${textClass} text-on-surface-variant`}>
        ({count} {count === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  )
}
