'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, TrendingUp, Clock, Heart, Calendar, BarChart3, Target } from 'lucide-react'

export type SortOption = 'relevancy' | 'recent' | 'liked_today' | 'liked_week' | 'liked_month' | 'liked_all_time'

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
    description: 'Personalized recommendations based on your interests'
  },
  {
    value: 'recent',
    label: 'Most Recent',
    icon: Clock,
    description: 'Newest posts first'
  },
  {
    value: 'liked_today',
    label: 'Most Liked Today',
    icon: Heart,
    description: 'Posts with the most likes in the last 24 hours'
  },
  {
    value: 'liked_week',
    label: 'Most Liked This Week',
    icon: TrendingUp,
    description: 'Top posts from the past week'
  },
  {
    value: 'liked_month',
    label: 'Most Liked This Month',
    icon: Calendar,
    description: 'Monthly engagement champions'
  },
  {
    value: 'liked_all_time',
    label: 'Most Liked All Time',
    icon: BarChart3,
    description: 'Historical top performers'
  }
]

interface FeedSortingProps {
  currentSort: SortOption
  onSortChange: (sort: SortOption) => void
  isPublicFeed?: boolean
  className?: string
  postCount?: number
}

export default function FeedSorting({ 
  currentSort, 
  onSortChange, 
  isPublicFeed = true,
  className = '',
  postCount
}: FeedSortingProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [sortPreference, setSortPreference] = useState<SortOption>('relevancy')

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('feed_sort_preference')
    if (saved && SORT_OPTIONS.some(opt => opt.value === saved)) {
      setSortPreference(saved as SortOption)
      if (currentSort !== saved) {
        onSortChange(saved as SortOption)
      }
    }
  }, [])

  // Save preference when changed
  const handleSortChange = (sort: SortOption) => {
    setSortPreference(sort)
    localStorage.setItem('feed_sort_preference', sort)
    onSortChange(sort)
    setIsOpen(false)
  }

  // If not public feed, don't show sorting options
  if (!isPublicFeed) {
    return null
  }

  const currentConfig = SORT_OPTIONS.find(opt => opt.value === currentSort) || SORT_OPTIONS[0]
  const CurrentIcon = currentConfig.icon

  return (
    <div className={`relative ${className}`}>
      {/* Sort Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-green-500 focus:border-transparent"
      >
        <CurrentIcon className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {currentConfig.label}
        </span>
        {postCount !== undefined && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {postCount}
          </span>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 px-2 py-1">
              Sort Public Feed
            </h3>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {SORT_OPTIONS.map((option) => {
              const Icon = option.icon
              const isSelected = currentSort === option.value
              const isRelevancy = option.value === 'relevancy'
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  className={`w-full text-left px-3 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                    isSelected ? 'bg-green-50 border-green-100' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${
                          isSelected ? 'text-green-900' : 'text-gray-900'
                        }`}>
                          {option.label}
                        </span>
                        {isRelevancy && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            AI
                          </span>
                        )}
                        {isSelected && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${
                        isSelected ? 'text-green-700' : 'text-gray-500'
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
          <div className="p-3 bg-blue-50 border-t border-blue-100">
            <div className="flex items-start space-x-2">
              <div className="p-1 bg-blue-100 rounded">
                <Target className="h-3 w-3 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-800 font-medium">
                  Personalized Recommendations
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  The relevancy algorithm learns from your interactions to show content you&apos;ll love most.
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