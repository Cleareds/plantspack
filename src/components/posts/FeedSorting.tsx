'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, TrendingUp, Clock, BarChart3, Target } from 'lucide-react'

export type SortOption = 'relevancy' | 'recent' | 'liked_week' | 'liked_all_time'

interface SortConfig {
  value: SortOption
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const SORT_OPTIONS: SortConfig[] = [
  {
    value: 'relevancy',
    label: 'Relevancy',
    icon: Target,
    description: 'Smart ranking based on engagement and recency'
  },
  {
    value: 'recent',
    label: 'Most Recent',
    icon: Clock,
    description: 'Newest posts first'
  },
  {
    value: 'liked_week',
    label: 'Most Liked',
    icon: TrendingUp,
    description: 'Top posts from the past week'
  },
  {
    value: 'liked_all_time',
    label: 'Most Liked All Time',
    icon: BarChart3,
    description: 'All-time most liked posts'
  }
]

interface FeedSortingProps {
  currentSort: SortOption
  onSortChange: (sort: SortOption) => void
  className?: string
  postCount?: number
}

export default function FeedSorting({ 
  currentSort, 
  onSortChange, 
  className = '',
  postCount
}: FeedSortingProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('feed_sort_preference')
    if (saved && SORT_OPTIONS.some(opt => opt.value === saved)) {
      if (currentSort !== saved) {
        onSortChange(saved as SortOption)
      }
    }
  }, [currentSort, onSortChange])

  // Save preference when changed
  const handleSortChange = (sort: SortOption) => {
    localStorage.setItem('feed_sort_preference', sort)
    onSortChange(sort)
    setIsOpen(false)
  }


  const currentConfig = SORT_OPTIONS.find(opt => opt.value === currentSort) || SORT_OPTIONS[0]
  const CurrentIcon = currentConfig.icon

  return (
    <div className={`relative ${className}`}>
      {/* Sort Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 sm:space-x-2 px-1 sm:px-4 py-1 sm:py-2 bg-surface-container-lowest ghost-border rounded-lg hover:bg-surface-container-low transition-colors focus:ring-1 focus:ring-primary/40 focus:outline-none"
      >
        <CurrentIcon className="h-4 w-4 text-on-surface-variant" />
        <span className="text-sm font-medium text-on-surface-variant">
          {currentConfig.label}
        </span>
        {postCount !== undefined && (
          <span className="text-xs text-outline bg-surface-container-low px-2 py-1 rounded-full">
            {postCount}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 text-outline transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 sm:right-auto sm:left-0 mt-2 w-80 bg-surface-container-lowest ghost-border rounded-lg shadow-ambient z-50">
          <div className="p-2 border-b border-outline-variant/15">
            <h3 className="text-sm font-semibold text-on-surface-variant px-2 py-1">
              Sort Feed
            </h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon
              const isSelected = currentSort === option.value

              return (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className={`w-full text-left px-3 py-3 hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 last:border-b-0 ${
                    isSelected ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected 
                        ? 'bg-primary/15 text-primary' 
                        : 'bg-surface-container-low text-on-surface-variant'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${
                          isSelected ? 'text-primary' : 'text-on-surface'
                        }`}>
                          {option.label}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-1 bg-primary/15 text-primary text-xs rounded-full font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${
                        isSelected ? 'text-primary' : 'text-outline'
                      }`}>
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          
          {/* Quick tip */}
          <div className="p-3 bg-surface-container-low border-t border-outline-variant/15">
            <div className="flex items-start space-x-2">
              <div className="p-1 bg-surface-container rounded">
                <Target className="h-3 w-3 text-primary" />
              </div>
              <div>
                <p className="text-xs text-on-surface font-medium">
                  Smart Ranking
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  The relevancy algorithm combines engagement signals and recency to surface the most interesting content.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

// Export types for use in other components
export { SORT_OPTIONS }
export type { SortConfig }