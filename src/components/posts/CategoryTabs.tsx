'use client'

import type { PostCategory } from '@/lib/database.types'

const CATEGORIES: { slug: PostCategory | 'all'; icon: string; label: string }[] = [
  { slug: 'all', icon: 'apps', label: 'All' },
  { slug: 'recipe', icon: 'restaurant_menu', label: 'Recipes' },
  { slug: 'place', icon: 'location_on', label: 'Places' },
  { slug: 'event', icon: 'event', label: 'Events' },
  { slug: 'lifestyle', icon: 'self_improvement', label: 'Lifestyle' },
  { slug: 'activism', icon: 'campaign', label: 'Activism' },
  { slug: 'question', icon: 'help', label: 'Questions' },
  { slug: 'product', icon: 'shopping_bag', label: 'Products' },
  { slug: 'general', icon: 'article', label: 'General' },
]

interface CategoryTabsProps {
  activeCategory: PostCategory | 'all'
  onCategoryChange: (category: PostCategory | 'all') => void
  userCategories?: string[]
}

export default function CategoryTabs({ activeCategory, onCategoryChange, userCategories }: CategoryTabsProps) {
  const visibleCategories = userCategories
    ? CATEGORIES.filter(c => c.slug === 'all' || userCategories.includes(c.slug))
    : CATEGORIES

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {visibleCategories.map((cat) => (
        <button
          key={cat.slug}
          onClick={() => onCategoryChange(cat.slug)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeCategory === cat.slug
              ? 'bg-primary text-on-primary-btn'
              : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  )
}
