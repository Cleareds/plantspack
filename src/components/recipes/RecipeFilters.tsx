'use client'

import { useState, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X, Loader2 } from 'lucide-react'
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
  { value: '', label: 'All' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

const ALL_TAGS = [
  { group: 'Style', tags: ['quick & easy', 'one-pot', 'meal prep', 'raw', 'no-bake', 'baking', 'comfort food'] },
  { group: 'Diet', tags: ['gluten-free', 'nut-free', 'soy-free', 'oil-free', 'high-protein', 'whole foods'] },
  { group: 'Other', tags: ['budget-friendly', 'kid-friendly', 'batch cooking', 'holiday'] },
]

interface RecipeFiltersProps {
  initialRecipes: any[]
  initialHasMore: boolean
  pageSize: number
  totalCount?: number
}

export default function RecipeFilters({ initialRecipes, initialHasMore, pageSize, totalCount }: RecipeFiltersProps) {
  const searchParams = useSearchParams()
  const tagFromUrl = searchParams?.get('tag') || ''
  const mealFromUrl = searchParams?.get('mealType') || ''

  const [search, setSearch] = useState('')
  const [mealType, setMealType] = useState(mealFromUrl)
  const [difficulty, setDifficulty] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>(tagFromUrl ? [tagFromUrl] : [])
  const [showFilters, setShowFilters] = useState(false)

  // Pagination state
  const [allRecipes, setAllRecipes] = useState<any[]>(initialRecipes)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const offset = allRecipes.length
      const res = await fetch(`/api/recipes?offset=${offset}&limit=${pageSize}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      const newRecipes: any[] = data.recipes || []
      setAllRecipes(prev => {
        // Deduplicate by id in case of overlap
        const existingIds = new Set(prev.map((r: any) => r.id))
        const unique = newRecipes.filter((r: any) => !existingIds.has(r.id))
        return [...prev, ...unique]
      })
      setHasMore(data.hasMore ?? false)
    } catch (err) {
      console.error('Failed to load more recipes:', err)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, allRecipes.length, pageSize])

  const toggleTag = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const clearAll = () => {
    setSearch('')
    setMealType('')
    setDifficulty('')
    setActiveTags([])
    window.history.replaceState(null, '', '/recipes')
  }

  const activeFilterCount = (mealType ? 1 : 0) + (difficulty ? 1 : 0) + activeTags.length

  const filtered = useMemo(() => {
    return allRecipes.filter(r => {
      const rd = r.recipe_data as any
      if (search && !(r.title || r.content || '').toLowerCase().includes(search.toLowerCase())) return false
      if (mealType && rd?.meal_type !== mealType) return false
      if (difficulty && rd?.difficulty !== difficulty) return false
      if (activeTags.length > 0 && !activeTags.every(tag => (r.secondary_tags || []).includes(tag))) return false
      return true
    })
  }, [allRecipes, search, mealType, difficulty, activeTags])

  // Collect tags that exist in the data for relevance
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    allRecipes.forEach(r => (r.secondary_tags || []).forEach((t: string) => tagSet.add(t)))
    return tagSet
  }, [allRecipes])

  return (
    <>
      {/* Search + filter toggle */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-outline" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-outline-variant/15 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container-lowest"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'bg-primary text-on-primary-btn'
              : 'bg-surface-container-lowest ghost-border text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 w-5 h-5 rounded-full bg-white/20 text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Meal type pills (always visible) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2">
        {MEAL_TYPES.map(m => (
          <button
            key={m.value}
            onClick={() => setMealType(mealType === m.value ? '' : m.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              mealType === m.value ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-lowest ghost-border text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Expandable filter panel */}
      {showFilters && (
        <div className="bg-surface-container-lowest rounded-lg ghost-border p-4 mb-4 space-y-4">
          {/* Difficulty */}
          <div>
            <p className="text-xs font-medium text-on-surface-variant mb-2">Difficulty</p>
            <div className="flex gap-1.5">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(difficulty === d.value ? '' : d.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    difficulty === d.value ? 'bg-primary text-on-primary-btn' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags (multi-select) */}
          {ALL_TAGS.map(group => {
            const relevant = group.tags.filter(t => availableTags.has(t))
            if (relevant.length === 0) return null
            return (
              <div key={group.group}>
                <p className="text-xs font-medium text-on-surface-variant mb-2">{group.group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {relevant.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        activeTags.includes(tag)
                          ? 'bg-primary text-on-primary-btn'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="text-xs text-primary hover:underline font-medium">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Active filters summary */}
      {activeTags.length > 0 && !showFilters && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {activeTags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-on-primary-btn">
              {tag}
              <button onClick={() => toggleTag(tag)}><X className="h-3 w-3" /></button>
            </span>
          ))}
          <button onClick={() => setActiveTags([])} className="text-xs text-primary hover:underline">Clear</button>
        </div>
      )}

      {/* Results count */}
      <p className="text-xs text-on-surface-variant mb-4">
        {activeFilterCount > 0 || search
          ? `${filtered.length} ${filtered.length === 1 ? 'recipe' : 'recipes'} found`
          : totalCount && totalCount > allRecipes.length
            ? `Showing ${allRecipes.length} of ${totalCount} recipes`
            : `${filtered.length} ${filtered.length === 1 ? 'recipe' : 'recipes'}`
        }
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((recipe: any) => (
            <RecipeCard key={recipe.id} recipe={recipe} onTagClick={toggleTag} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4 block">restaurant_menu</span>
          <h3 className="text-lg font-medium text-on-surface mb-2">No recipes found</h3>
          <p className="text-on-surface-variant text-sm">
            {activeFilterCount > 0 ? 'Try removing some filters' : 'Try a different search term'}
          </p>
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="mt-3 text-sm text-primary hover:underline font-medium">Clear all filters</button>
          )}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-primary text-on-primary-btn hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Recipes'
            )}
          </button>
        </div>
      )}
    </>
  )
}
