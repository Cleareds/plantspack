'use client'

import { MapPin } from 'lucide-react'

const categories = [
  { value: 'all', label: 'All' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'cafe', label: 'Cafes' },
  { value: 'event', label: 'Events' },
  { value: 'museum', label: 'Museums' },
  { value: 'other', label: 'Other' },
]

interface MapCategoryPillsProps {
  selected: string
  onSelect: (category: string) => void
}

export default function MapCategoryPills({ selected, onSelect }: MapCategoryPillsProps) {
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
            <MapPin className="h-3.5 w-3.5" />
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}

export { categories }
