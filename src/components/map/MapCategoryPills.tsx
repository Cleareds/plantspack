'use client'

const categories = [
  { value: 'all', label: 'All', icon: 'apps' },
  { value: 'eat', label: 'Eat', icon: 'restaurant' },
  { value: 'hotel', label: 'Stay', icon: 'hotel' },
  { value: 'store', label: 'Store', icon: 'storefront' },
  { value: 'organisation', label: 'Sanctuary', icon: 'pets' },
]

const subcategories: Record<string, { value: string; label: string }[]> = {
  eat: [
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'cafe', label: 'Cafe' },
    { value: 'fast_food', label: 'Fast Food' },
    { value: 'bar', label: 'Bar/Pub' },
    { value: 'bakery', label: 'Bakery' },
  ],
  store: [
    { value: 'grocery', label: 'Grocery' },
    { value: 'health_food', label: 'Health Food' },
    { value: 'bakery', label: 'Bakery' },
  ],
  hotel: [
    { value: 'hotel', label: 'Hotel' },
    { value: 'hostel', label: 'Hostel' },
    { value: 'bnb', label: 'B&B' },
  ],
}

interface MapCategoryPillsProps {
  selected: string
  onSelect: (category: string) => void
  selectedSub?: string | null
  onSubSelect?: (sub: string | null) => void
  petFriendly?: boolean
  onPetToggle?: (value: boolean) => void
}

export default function MapCategoryPills({ selected, onSelect, selectedSub, onSubSelect, petFriendly, onPetToggle }: MapCategoryPillsProps) {
  const subs = subcategories[selected] || []

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => { onSelect(cat.value); onSubSelect?.(null) }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selected === cat.value
                ? 'bg-primary text-on-primary-btn'
                : 'bg-secondary-container text-on-surface hover:opacity-80'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{cat.icon}</span>
            {cat.label}
          </button>
        ))}

        <div className="w-px h-5 bg-outline-variant/30 flex-shrink-0" />

        {onPetToggle && (
          <button
            onClick={() => onPetToggle(!petFriendly)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              petFriendly ? 'bg-orange-500 text-white' : 'bg-secondary-container text-on-surface hover:opacity-80'
            }`}
          >
            🐾 Pets
          </button>
        )}
      </div>

      {/* Subcategory pills */}
      {subs.length > 0 && onSubSelect && (
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {subs.map(sub => (
            <button
              key={sub.value}
              onClick={() => onSubSelect(selectedSub === sub.value ? null : sub.value)}
              className={`px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
                selectedSub === sub.value
                  ? 'bg-primary/80 text-on-primary-btn'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { categories }
