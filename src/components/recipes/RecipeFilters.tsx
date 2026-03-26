'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import RecipeCard from './RecipeCard'

const MEAL_TYPES = [
  { value: '', label: 'All' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'desserts', label: 'Desserts' },
  { value: 'drinks', label: 'Drinks' },
]

const DIFFICULTIES = [
  { value: '', label: 'All', icon: 'apps' },
  { value: 'easy', label: 'Easy', icon: 'sentiment_satisfied' },
  { value: 'medium', label: 'Medium', icon: 'local_fire_department' },
  { value: 'hard', label: 'Hard', icon: 'whatshot' },
]

interface RecipeFiltersProps {
  initialRecipes: any[]
}

export default function RecipeFilters({ initialRecipes }: RecipeFiltersProps) {
  const searchParams = useSearchParams()
  const tagFromUrl = searchParams?.get('tag') || ''
  const mealFromUrl = searchParams?.get('mealType') || ''

  const [search, setSearch] = useState('')
  const [mealType, setMealType] = useState(mealFromUrl)
  const [difficulty, setDifficulty] = useState('')
  const [activeTag, setActiveTag] = useState(tagFromUrl)

  const filtered = useMemo(() => {
    return initialRecipes.filter(r => {
      const rd = r.recipe_data as any
      if (search && !(r.title || r.content || '').toLowerCase().includes(search.toLowerCase())) return false
      if (mealType && rd?.meal_type !== mealType) return false
      if (difficulty && rd?.difficulty !== difficulty) return false
      if (activeTag && !(r.secondary_tags || []).includes(activeTag)) return false
      return true
    })
  }, [initialRecipes, search, mealType, difficulty, activeTag])

  return (
    <>
      {/* Active tag banner */}
      {activeTag && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-on-surface-variant">Filtered by:</span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-primary text-on-primary-btn">
            {activeTag}
            <button onClick={() => { setActiveTag(''); window.history.replaceState(null, '', '/recipes') }}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-4 mb-6">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-outline" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-outline-variant/15 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Meal type pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {MEAL_TYPES.map(m => (
              <button
                key={m.value}
                onClick={() => setMealType(m.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  mealType === m.value ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Difficulty pills */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {DIFFICULTIES.map(d => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  difficulty === d.value ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{d.icon}</span>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-on-surface-variant mb-4">{filtered.length} recipes</p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((recipe: any) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4 block">restaurant_menu</span>
          <h3 className="text-lg font-medium text-on-surface mb-2">No recipes found</h3>
          <p className="text-on-surface-variant">Try adjusting your search or filters</p>
        </div>
      )}
    </>
  )
}
