'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { Search } from 'lucide-react'
import RecipeCard from '@/components/recipes/RecipeCard'
import { usePageState } from '@/hooks/usePageState'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'

export default function RecipesPage() {
  const { user } = useAuth()
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const [state, setState] = usePageState({
    key: 'recipes_state',
    defaultValue: { search: '', difficulty: '', maxPrepTime: '', servings: '', mealType: '' },
    userId: user?.id,
  })

  const setSearch = useCallback((s: string) => setState(prev => ({ ...prev, search: s })), [setState])
  const setDifficulty = useCallback((d: string) => setState(prev => ({ ...prev, difficulty: d })), [setState])
  const setMaxPrepTime = useCallback((t: string) => setState(prev => ({ ...prev, maxPrepTime: t })), [setState])
  const setServings = useCallback((s: string) => setState(prev => ({ ...prev, servings: s })), [setState])
  const setMealType = useCallback((m: string) => setState(prev => ({ ...prev, mealType: m })), [setState])

  useScrollRestoration({ key: 'recipes_scroll' })

  const difficulties = [
    { value: '', label: 'All', icon: 'apps' },
    { value: 'easy', label: 'Easy', icon: 'sentiment_satisfied' },
    { value: 'medium', label: 'Medium', icon: 'local_fire_department' },
    { value: 'hard', label: 'Hard', icon: 'whatshot' },
  ]

  const prepTimes = [
    { value: '', label: 'Any time' },
    { value: '15', label: 'Under 15min' },
    { value: '30', label: 'Under 30min' },
    { value: '60', label: 'Under 1hr' },
  ]

  const servingsOptions = [
    { value: '', label: 'Any servings' },
    { value: '1-2', label: '1-2' },
    { value: '3-4', label: '3-4' },
    { value: '5-99', label: '5+' },
  ]

  const fetchRecipes = async (offset = 0) => {
    try {
      if (offset === 0) setLoading(true)
      else setLoadingMore(true)

      const params = new URLSearchParams()
      if (state.search) params.append('search', state.search)
      if (state.difficulty) params.append('difficulty', state.difficulty)
      if (state.maxPrepTime) params.append('maxPrepTime', state.maxPrepTime)
      if (state.servings) params.append('servings', state.servings)
      if (state.mealType) params.append('mealType', state.mealType)
      params.append('limit', '20')
      params.append('offset', String(offset))

      const response = await fetch(`/api/recipes?${params}`)
      const data = await response.json()

      if (response.ok) {
        if (offset === 0) {
          setRecipes(data.recipes)
        } else {
          setRecipes(prev => [...prev, ...data.recipes])
        }
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Error fetching recipes:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchRecipes()
  }, [state.search, state.difficulty, state.maxPrepTime, state.servings, state.mealType])

  return (
    <div className="min-h-screen bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-headline font-bold text-on-surface mb-2 tracking-tight">
            Recipes
          </h1>
          <p className="text-on-surface-variant">
            Discover delicious vegan recipes from the community
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* Search + dropdowns row */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-outline" />
                <input
                  type="text"
                  placeholder="Search recipes..."
                  value={state.search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-outline-variant/15 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <select
                value={state.maxPrepTime}
                onChange={(e) => setMaxPrepTime(e.target.value)}
                className="px-3 py-2 border border-outline-variant/15 rounded-md text-sm text-on-surface bg-transparent focus:ring-2 focus:ring-primary"
              >
                {prepTimes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <select
                value={state.servings}
                onChange={(e) => setServings(e.target.value)}
                className="px-3 py-2 border border-outline-variant/15 rounded-md text-sm text-on-surface bg-transparent focus:ring-2 focus:ring-primary"
              >
                {servingsOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Meal type pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { value: '', label: 'All' },
                { value: 'breakfast', label: 'Breakfast' },
                { value: 'lunch', label: 'Lunch' },
                { value: 'dinner', label: 'Dinner' },
                { value: 'snacks', label: 'Snacks' },
                { value: 'desserts', label: 'Desserts' },
                { value: 'drinks', label: 'Drinks' },
              ].map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMealType(m.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    state.mealType === m.value
                      ? 'bg-primary text-on-primary-btn'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Difficulty pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              {difficulties.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    state.difficulty === d.value
                      ? 'bg-primary text-on-primary-btn'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{d.icon}</span>
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-on-surface-variant">Loading recipes...</p>
          </div>
        )}

        {/* Grid */}
        {!loading && recipes.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => fetchRecipes(recipes.length)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-primary text-on-primary-btn rounded-full font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && recipes.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant/30 mb-4 block">restaurant_menu</span>
            <h3 className="text-lg font-medium text-on-surface mb-2">No recipes found</h3>
            <p className="text-on-surface-variant">
              {state.search || state.difficulty || state.maxPrepTime || state.servings
                ? 'Try adjusting your search or filters'
                : 'Be the first to share a recipe!'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
