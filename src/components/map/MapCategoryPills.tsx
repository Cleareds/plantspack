'use client'

const categories = [
  { value: 'all', label: 'All', icon: 'apps' },
  { value: 'eat', label: 'Eat', icon: 'restaurant' },
  { value: 'hotel', label: 'Stay', icon: 'hotel' },
  { value: 'store', label: 'Stores', icon: 'storefront' },
  { value: 'event', label: 'Events', icon: 'event' },
  { value: 'organisation', label: 'Organisations', icon: 'corporate_fare' },
  { value: 'other', label: 'Other', icon: 'more_horiz' },
]

interface MapCategoryPillsProps {
  selected: string
  onSelect: (category: string) => void
  veganOnly?: boolean
  onVeganToggle?: (value: boolean) => void
  petFriendly?: boolean
  onPetToggle?: (value: boolean) => void
}

export default function MapCategoryPills({ selected, onSelect, veganOnly, onVeganToggle, petFriendly, onPetToggle }: MapCategoryPillsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 -mb-1">
      {categories.map((cat) => {
        const isActive = selected === cat.value
        return (
          <button
            key={cat.value}
            onClick={() => onSelect(cat.value)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
              transition-colors duration-150
              ${isActive
                ? 'bg-primary text-on-primary-btn'
                : 'bg-secondary-container text-on-surface hover:opacity-80'
              }
            `}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{cat.icon}</span>
            {cat.label}
          </button>
        )
      })}

      {/* Divider */}
      <div className="w-px h-6 bg-outline-variant/30 flex-shrink-0" />

      {/* Vegan-only toggle */}
      {onVeganToggle && (
        <button
          onClick={() => onVeganToggle(!veganOnly)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            veganOnly ? 'bg-green-600 text-white' : 'bg-secondary-container text-on-surface hover:opacity-80'
          }`}
        >
          <span style={{ fontSize: '14px' }}>🌿</span>
          100% Vegan
        </button>
      )}

      {/* Pet-friendly toggle */}
      {onPetToggle && (
        <button
          onClick={() => onPetToggle(!petFriendly)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            petFriendly ? 'bg-green-600 text-white' : 'bg-secondary-container text-on-surface hover:opacity-80'
          }`}
        >
          <span style={{ fontSize: '14px' }}>🐾</span>
          Pet-Friendly
        </button>
      )}

    </div>
  )
}

export { categories }
