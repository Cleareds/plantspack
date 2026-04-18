'use client'

import { Star } from 'lucide-react'
import Link from 'next/link'
import StarRating from './StarRating'

interface RatingBadgeProps {
  rating?: number | null
  reviewCount?: number | null
  size?: 'xs' | 'sm' | 'md'
  showEmpty?: boolean
  /** When provided, wraps the entire badge in a link to this href */
  href?: string
  /** @deprecated use `href` — retained for callers that only want the empty CTA linked */
  emptyHref?: string
  className?: string
}

/**
 * Compact, consistent rating display used under place titles across the app.
 * - xs: single star + value + "· N" (dense, used on small cards and map popups)
 * - sm/md: full StarRating grid + "(N reviews)"
 * Renders nothing when reviewCount is 0 unless showEmpty is set.
 *
 * Pass `href` to make the whole badge clickable (e.g. to scroll to #reviews).
 * Do NOT pass `href` when the badge is already inside a parent <Link> — nested
 * anchors are invalid HTML.
 */
export default function RatingBadge({
  rating,
  reviewCount,
  size = 'sm',
  showEmpty = false,
  href,
  emptyHref,
  className = '',
}: RatingBadgeProps) {
  const hasRating = typeof rating === 'number' && rating > 0 && (reviewCount ?? 0) > 0

  if (!hasRating) {
    if (!showEmpty) return null
    const label = 'No reviews yet'
    const targetHref = href || emptyHref
    const inner = (
      <>
        <Star className="h-4 w-4 inline-block mr-1 opacity-40" />
        <span>{label}</span>
        {targetHref && !href && (
          <Link href={targetHref} className="text-primary hover:underline ml-1">
            Be the first to review
          </Link>
        )}
        {href && (
          <span className="text-primary ml-1 hover:underline">Be the first to review</span>
        )}
      </>
    )
    const content = (
      <div className={`text-sm text-on-surface-variant ${className}`}>{inner}</div>
    )
    return href ? (
      <Link href={href} className="inline-block cursor-pointer" aria-label="Jump to reviews">
        {content}
      </Link>
    ) : content
  }

  const count = reviewCount!
  const value = rating!.toFixed(1)

  let body: React.ReactNode
  if (size === 'xs') {
    body = (
      <span className={`inline-flex items-center gap-1 text-xs text-on-surface-variant ${className}`}>
        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
        <span className="font-medium text-on-surface">{value}</span>
        <span className="opacity-60">· {count}</span>
      </span>
    )
  } else {
    const textClass = size === 'md' ? 'text-sm' : 'text-xs'
    body = (
      <div className={`flex items-center gap-2 ${className}`}>
        <StarRating rating={rating!} size={size} showValue />
        <span className={`${textClass} text-on-surface-variant`}>
          ({count} {count === 1 ? 'review' : 'reviews'})
        </span>
      </div>
    )
  }

  return href ? (
    <Link
      href={href}
      className="inline-block cursor-pointer hover:opacity-80 transition-opacity"
      aria-label={`${value} stars from ${count} ${count === 1 ? 'review' : 'reviews'} — jump to reviews`}
    >
      {body}
    </Link>
  ) : body
}
