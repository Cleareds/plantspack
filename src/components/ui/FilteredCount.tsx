'use client'

import { useVeganFilter } from '@/lib/vegan-filter-context'

interface FilteredCountProps {
  total: number
  fullyVegan?: number
  suffix?: string
}

/**
 * Displays count that adapts to the global vegan toggle.
 * SSR renders total, client adjusts to fully_vegan if toggle is on.
 */
export default function FilteredCount({ total, fullyVegan, suffix = 'places' }: FilteredCountProps) {
  const { isFullyVeganOnly } = useVeganFilter()
  const count = isFullyVeganOnly && fullyVegan !== undefined ? fullyVegan : total
  return <>{count.toLocaleString()} {count === 1 ? suffix.replace(/s$/, '') : suffix}</>
}

export function FilteredTotal({ total, fullyVegan }: { total: number; fullyVegan?: number }) {
  const { isFullyVeganOnly } = useVeganFilter()
  const count = isFullyVeganOnly && fullyVegan !== undefined ? fullyVegan : total
  return <>{count.toLocaleString()}</>
}

export function FilteredLabel({ allLabel, veganLabel }: { allLabel: string; veganLabel: string }) {
  const { isFullyVeganOnly } = useVeganFilter()
  return <>{isFullyVeganOnly ? veganLabel : allLabel}</>
}

/**
 * "(N fully vegan)" parenthetical that only appears when the global
 * vegan toggle is OFF (because when ON, the headline count is already
 * the fully-vegan count). Hidden if there are no fully-vegan rows.
 *
 * Used on country / city descriptor lines where the headline count
 * mixes vegan + vegan-friendly tiers; the parenthetical surfaces the
 * verified fully-vegan share without inflating the main number.
 */
export function FullyVeganNote({ count }: { count: number }) {
  const { isFullyVeganOnly } = useVeganFilter()
  if (isFullyVeganOnly || count <= 0) return null
  return <> ({count.toLocaleString()} fully vegan)</>
}
