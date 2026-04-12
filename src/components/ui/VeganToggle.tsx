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
      className={`group flex items-center gap-2 ${className}`}
      title={isFullyVeganOnly ? 'Showing 100% vegan only — click to show all' : 'Click to show only 100% vegan places'}
    >
      {/* Toggle track */}
      <div className={`relative w-8 h-[18px] rounded-full transition-colors ${
        isFullyVeganOnly ? 'bg-emerald-600' : 'bg-outline-variant/30'
      }`}>
        {/* Toggle knob */}
        <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${
          isFullyVeganOnly ? 'translate-x-[16px]' : 'translate-x-[2px]'
        }`} />
      </div>
      {/* Label */}
      <span className={`text-[11px] font-medium whitespace-nowrap ${
        isFullyVeganOnly ? 'text-emerald-700' : 'text-on-surface-variant'
      }`}>
        {isFullyVeganOnly ? '100% Vegan' : 'Vegan Friendly'}
      </span>
    </button>
  )
}
