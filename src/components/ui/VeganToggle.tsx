'use client'

import { useVeganFilter } from '@/lib/vegan-filter-context'

interface VeganToggleProps {
  className?: string
}

export default function VeganToggle({ className = '' }: VeganToggleProps) {
  const { isFullyVeganOnly, setVeganFilter } = useVeganFilter()

  return (
    <button
      onClick={() => setVeganFilter(isFullyVeganOnly ? 'all' : 'fully_vegan')}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
        isFullyVeganOnly
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'bg-surface-container-low text-on-surface-variant ghost-border hover:bg-surface-container'
      } ${className}`}
      title={isFullyVeganOnly ? 'Showing 100% vegan only — click to show all' : 'Click to show only 100% vegan places'}
    >
      🌿 {isFullyVeganOnly ? '100% Vegan' : 'All Places'}
    </button>
  )
}
