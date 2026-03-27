'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { PackWithStats, PackCategory } from '@/types/packs'
import PackCard from '@/components/packs/PackCard'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { usePageState } from '@/hooks/usePageState'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'

export default function PacksPage() {
  const { user } = useAuth()
  const [packs, setPacks] = useState<PackWithStats[]>([])
  const [myPacks, setMyPacks] = useState<PackWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [myPacksLoading, setMyPacksLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)

  const [packsState, setPacksState] = usePageState({
    key: 'packs_state',
    defaultValue: { search: '', category: '' as PackCategory | '' },
    userId: user?.id,
  })
  const search = packsState.search
  const category = packsState.category
  const setSearch = useCallback((s: string) => setPacksState(prev => ({ ...prev, search: s })), [setPacksState])
  const setCategory = useCallback((c: PackCategory | '') => setPacksState(prev => ({ ...prev, category: c })), [setPacksState])

  useScrollRestoration({ key: 'packs_scroll' })

  const categories: { value: PackCategory | ''; label: string; icon: string }[] = [
    { value: '', label: 'All', icon: 'apps' },
    { value: 'recipes', label: 'Recipes', icon: 'restaurant_menu' },
    { value: 'places', label: 'Places', icon: 'place' },
    { value: 'traveling', label: 'Travel Guides', icon: 'flight' },
    { value: 'products', label: 'Products', icon: 'shopping_bag' },
    { value: 'activism', label: 'Activism', icon: 'volunteer_activism' },
    { value: 'lifestyle', label: 'Lifestyle', icon: 'self_improvement' },
    { value: 'other', label: 'Other', icon: 'more_horiz' }
  ]

  const fetchPacks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (category) params.append('category', category)
      params.append('limit', '20')

      const response = await fetch(`/api/packs?${params}`)
      const data = await response.json()

      if (response.ok) {
        setPacks(data.packs)
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Error fetching packs:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMyPacks = async () => {
    if (!user) {
      setMyPacks([])
      setMyPacksLoading(false)
      return
    }
    try {
      setMyPacksLoading(true)
      const response = await fetch(`/api/packs?creator_id=${user.id}&limit=50`)
      const data = await response.json()
      if (response.ok) {
        setMyPacks(data.packs)
      }
    } catch (error) {
      console.error('Error fetching my packs:', error)
    } finally {
      setMyPacksLoading(false)
    }
  }

  useEffect(() => {
    fetchPacks()
  }, [search, category])

  useEffect(() => {
    fetchMyPacks()
  }, [user])

  return (
    <div className="min-h-screen bg-surface-container-low">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-headline font-bold text-on-surface mb-2 tracking-tight">
              Packs
            </h1>
            <p className="text-on-surface-variant">
              Discover and join curated vegan communities
            </p>
          </div>

          {user && (
            <div className="mt-4 md:mt-0">
              <Link
                href="/packs/create"
                className="inline-flex items-center gap-2 silk-gradient hover:opacity-90 text-on-primary px-4 py-2 rounded-md font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Create Pack</span>
              </Link>
            </div>
          )}
        </div>

        {/* My Packs */}
        {user && !myPacksLoading && myPacks.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-headline font-bold text-on-surface tracking-tight">My Packs</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPacks.map((pack) => (
                <PackCard key={pack.id} pack={pack} />
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-surface-container-lowest rounded-lg editorial-shadow ghost-border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-outline" />
              <input
                type="text"
                placeholder="Search packs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-outline-variant/15 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    category === cat.value
                      ? 'bg-primary text-on-primary-btn'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-on-surface-variant">Loading packs...</p>
          </div>
        )}

        {/* Packs Grid */}
        {!loading && packs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packs.map((pack) => (
              <PackCard key={pack.id} pack={pack} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && packs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-on-surface mb-2">
              No packs found
            </h3>
            <p className="text-on-surface-variant mb-4">
              {search || category
                ? 'Try adjusting your search or filters'
                : 'Be the first to create a pack!'}
            </p>
            {user && (
              <Link
                href="/packs/create"
                className="inline-flex items-center gap-2 silk-gradient hover:opacity-90 text-on-primary px-4 py-2 rounded-md font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span>Create Pack</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
