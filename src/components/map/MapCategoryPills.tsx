'use client'

const categories = [
  { value: 'all', label: 'All', icon: 'apps' },
  { value: 'eat', label: 'Eat', icon: 'restaurant' },
  { value: 'hotel', label: 'Hotels', icon: 'hotel' },
  { value: 'event', label: 'Events', icon: 'event' },
  { value: 'museum', label: 'Museums', icon: 'museum' },
  { value: 'organisation', label: 'Organisations', icon: 'corporate_fare' },
  { value: 'other', label: 'Other', icon: 'more_horiz' },
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
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{cat.icon}</span>
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}

export { categories }
