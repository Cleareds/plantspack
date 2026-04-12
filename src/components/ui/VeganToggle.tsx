'use client'

import { useVeganFilter } from '@/lib/vegan-filter-context'

interface VeganToggleProps {
  className?: string
  compact?: boolean
}

export default function VeganToggle({ className = '', compact = false }: VeganToggleProps) {
  const { veganFilter, setVeganFilter, isFullyVeganOnly } = useVeganFilter()

  return (
    <button
      onClick={() => setVeganFilter(isFullyVeganOnly ? 'all' : 'fully_vegan')}
      className={`flex items-center gap-1.5 transition-all ${
        isFullyVeganOnly
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'bg-surface-container-low text-on-surface-variant ghost-border hover:bg-surface-container'
      } ${compact ? 'px-2 py-1 rounded-md text-[10px]' : 'px-3 py-1.5 rounded-full text-xs'} font-medium ${className}`}
      title={isFullyVeganOnly ? 'Showing 100% vegan only — click to show all' : 'Click to show only 100% vegan places'}
    >
      🌿 {compact ? '100%' : '100% Vegan Only'}
    </button>
  )
}
