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
      className={`w-[130px] flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
        isFullyVeganOnly
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'bg-surface-container-low text-on-surface-variant ghost-border'
      } ${className}`}
      title={isFullyVeganOnly ? 'Showing 100% vegan only — click to show all' : 'Click to show only 100% vegan places'}
    >
      🌿 {isFullyVeganOnly ? '100% Vegan' : 'Vegan Friendly'}
    </button>
  )
}
