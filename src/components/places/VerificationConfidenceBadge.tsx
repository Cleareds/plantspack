'use client'

// The verification confidence badge - Axis 2 of the two-axis verification
// model (the other being vegan_level). Use the `compact` variant on card
// lists (cities, dish pages, search results) and the `full` variant on
// place detail pages alongside the existing VerificationFooter.

import { BadgeCheck, Users, Search, Database } from 'lucide-react'
import Link from 'next/link'
import { getConfidenceBadge, type ConfidenceBadge } from '@/lib/verification-badge'

const ICONS = { BadgeCheck, Users, Search, Database }

interface PlaceLike {
  is_verified?: boolean | null
  verification_level?: number | null
  verification_method?: string | null
  source?: string | null
  created_by?: string | null
  tags?: string[] | null
}

type Variant = 'compact' | 'full'

interface Props {
  place: PlaceLike
  variant?: Variant
  /** Show methodology link in full variant. Default true. */
  showLearnMore?: boolean
  className?: string
}

export default function VerificationConfidenceBadge({
  place,
  variant = 'compact',
  showLearnMore = true,
  className = '',
}: Props) {
  const badge = getConfidenceBadge(place)
  const Icon = ICONS[badge.icon] ?? Database

  if (variant === 'compact') {
    return (
      <span
        title={badge.description}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${badge.chipClass} ${className}`}
      >
        <Icon className={`h-3 w-3 ${badge.iconClass}`} aria-hidden />
        <span>{badge.short}</span>
      </span>
    )
  }

  // full variant - block layout for detail pages
  return (
    <div className={`rounded-xl border p-3 ${badge.chipClass} ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${badge.iconClass}`} aria-hidden />
        <span className="font-semibold text-sm">{badge.label}</span>
      </div>
      <p className="text-xs leading-relaxed">{badge.description}</p>
      {showLearnMore && (
        <Link
          href="/methodology"
          className="inline-block mt-2 text-xs font-medium underline opacity-80 hover:opacity-100"
        >
          How we verify -&gt;
        </Link>
      )}
    </div>
  )
}

/** Server-safe variant that returns just the badge data (for SSR contexts
 *  where you want to render without 'use client') */
export function getConfidenceBadgeForPlace(place: PlaceLike): ConfidenceBadge {
  return getConfidenceBadge(place)
}
