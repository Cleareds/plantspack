'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { PackWithStats, PackCategory } from '@/types/packs'
import PackCard from '@/components/packs/PackCard'
import Link from 'next/link'
import { Plus, Search, Crown } from 'lucide-react'

export default function PacksPage() {
  const { user, profile } = useAuth()
  const [packs, setPacks] = useState<PackWithStats[]>([])
  const [myPacks, setMyPacks] = useState<PackWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [myPacksLoading, setMyPacksLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<PackCategory | ''>('')
  const [hasMore, setHasMore] = useState(false)

  const categories: { value: PackCategory | ''; label: string; icon: string }[] = [
    { value: '', label: 'All', icon: '📦' },
    { value: 'recipes', label: 'Recipes', icon: '🍽️' },
    { value: 'traveling', label: 'Traveling', icon: '✈️' },
    { value: 'products', label: 'Products', icon: '🛍️' },
    { value: 'resources', label: 'Resources', icon: '📚' },
    { value: 'lifestyle', label: 'Lifestyle', icon: '🌱' },
    { value: 'other', label: 'Other', icon: '📦' }
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

  // Check if user can create packs (not on free tier)
  const subscriptionTier = (profile as any)?.subscription_tier
  const canCreatePacks = subscriptionTier && subscriptionTier !== 'free'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Packs
            </h1>
            <p className="text-gray-600">
              Discover curated collections of vegan content
            </p>
          </div>

          {user && (
            <div className="mt-4 md:mt-0">
              {canCreatePacks ? (
                <Link
                  href="/packs/create"
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create Pack</span>
                </Link>
              ) : (
                <div className="flex flex-col items-end gap-2">
                  <button
                    disabled
                    className="inline-flex items-center gap-2 bg-gray-400 cursor-not-allowed text-white px-4 py-2 rounded-md font-medium opacity-60"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Create Pack</span>
                  </button>
                  <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2 max-w-xs">
                    <p className="text-sm text-blue-900 flex items-center gap-2">
                      <Crown className="h-4 w-4 text-blue-600" />
                      <span>
                        Upgrade to{' '}
                        <Link href="/support" className="font-semibold underline hover:text-blue-700">
                          Mid or Premium
                        </Link>
                        {' '}to create packs
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* My Packs */}
        {user && !myPacksLoading && myPacks.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">My Packs</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myPacks.map((pack) => (
                <PackCard key={pack.id} pack={pack} />
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search packs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-md font-medium whitespace-nowrap transition-colors ${
                    category === cat.value
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="mt-2 text-gray-600">Loading packs...</p>
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No packs found
            </h3>
            <p className="text-gray-600 mb-4">
              {search || category
                ? 'Try adjusting your search or filters'
                : 'Be the first to create a pack!'}
            </p>
            {user && (
              <>
                {canCreatePacks ? (
                  <Link
                    href="/packs/create"
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Create Pack</span>
                  </Link>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <button
                      disabled
                      className="inline-flex items-center gap-2 bg-gray-400 cursor-not-allowed text-white px-4 py-2 rounded-md font-medium opacity-60"
                    >
                      <Plus className="h-5 w-5" />
                      <span>Create Pack</span>
                    </button>
                    <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 max-w-md">
                      <p className="text-sm text-blue-900 flex items-center justify-center gap-2">
                        <Crown className="h-4 w-4 text-blue-600" />
                        <span>
                          Upgrade to{' '}
                          <Link href="/support" className="font-semibold underline hover:text-blue-700">
                            Mid or Premium
                          </Link>
                          {' '}to create packs
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
