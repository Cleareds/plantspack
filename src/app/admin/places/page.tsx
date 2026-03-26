'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Search,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  MapPin,
  Star,
  Plus,
  X,
  CheckCircle,
  BadgeCheck
} from 'lucide-react'

interface Place {
  id: string
  name: string
  description: string | null
  address: string
  latitude: number
  longitude: number
  category: string
  rating: number | null
  user_id: string
  created_at: string
  users: {
    username: string
  }
}

const PLACES_PER_PAGE = 20

export default function PlacesManagement() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPlaces, setTotalPlaces] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    category: 'restaurant'
  })
  const [creating, setCreating] = useState(false)
  const [successPlace, setSuccessPlace] = useState<{ name: string; lat: number; lng: number } | null>(null)

  const loadPlaces = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('places')
        .select('*, users(username)', { count: 'exact' })

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory)
      }

      const from = (currentPage - 1) * PLACES_PER_PAGE
      const to = from + PLACES_PER_PAGE - 1
      query = query.range(from, to).order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) throw error

      setPlaces(data as any || [])
      setTotalPlaces(count || 0)
    } catch (error) {
      console.error('Error loading places:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, filterCategory])

  useEffect(() => {
    loadPlaces()
  }, [loadPlaces])

  const handleDeletePlace = async (placeId: string, placeName: string) => {
    if (!confirm(`Are you sure you want to delete "${placeName}"?`)) return

    try {
      const response = await fetch(`/api/admin/places/${placeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete place')
      }

      loadPlaces()
    } catch (error) {
      console.error('Error deleting place:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete place')
    }
  }

  const handleCreatePlace = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      // Validate coordinates
      const lat = parseFloat(createForm.latitude)
      const lng = parseFloat(createForm.longitude)

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid coordinates. Please enter valid numbers.')
      }

      const response = await fetch('/api/admin/places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description || null,
          address: createForm.address,
          latitude: lat,
          longitude: lng,
          category: createForm.category,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create place')
      }

      const placeName = createForm.name

      // Reset form and close modal
      setCreateForm({
        name: '',
        description: '',
        address: '',
        latitude: '',
        longitude: '',
        category: 'restaurant'
      })
      setShowCreateModal(false)

      loadPlaces()
      setSuccessPlace({ name: placeName, lat, lng })
      setTimeout(() => setSuccessPlace(null), 6000)
    } catch (error) {
      console.error('Error creating place:', error)
      alert(error instanceof Error ? error.message : 'Failed to create place')
    } finally {
      setCreating(false)
    }
  }

  const totalPages = Math.ceil(totalPlaces / PLACES_PER_PAGE)

  return (
    <div className="space-y-6">
      {/* Success toast */}
      {successPlace && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999]">
          <div className="bg-primary-container/20 border border-primary-container rounded-lg shadow-lg px-6 py-3 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-sm font-medium text-primary">
              &ldquo;{successPlace.name}&rdquo; added successfully!{' '}
              <Link
                href={`/map`}
                className="underline text-primary hover:text-on-surface"
              >
                View on map
              </Link>
            </p>
            <button onClick={() => setSuccessPlace(null)} className="text-primary hover:text-primary">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Places Management</h1>
          <p className="text-on-surface-variant mt-1">Manage all vegan places</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Place
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-outline" />
              <input
                type="text"
                placeholder="Search by name, address, or description..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Cafe</option>
              <option value="store">Store</option>
              <option value="market">Market</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-on-surface-variant">
            Showing {places.length} of {totalPlaces} places
          </p>
          <p className="text-sm text-on-surface-variant">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : places.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow">
          <AlertCircle className="h-12 w-12 text-outline mb-2" />
          <p className="text-on-surface-variant">No places found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {places.map((place) => (
            <div key={place.id} className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-on-surface">{place.name}</h3>
                  <p className="text-sm text-outline capitalize">{place.category}</p>
                </div>
                {place.rating && (
                  <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium text-yellow-900">
                      {place.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-start text-sm text-on-surface-variant">
                  <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{place.address}</span>
                </div>

                {place.description && (
                  <p className="text-sm text-on-surface-variant line-clamp-2">
                    {place.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between text-xs text-outline">
                  <span>Added by {place.users?.username || 'Unknown'}</span>
                  <span>{new Date(place.created_at).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={async () => {
                      const newVal = !(place as any).is_verified;
                      await supabase.from('places').update({ is_verified: newVal }).eq('id', place.id);
                      setPlaces((prev: any) => prev.map((p: any) => p.id === place.id ? { ...p, is_verified: newVal } : p));
                    }}
                    className={`inline-flex items-center justify-center px-3 py-2 border rounded-md text-xs font-medium ${
                      (place as any).is_verified
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-outline-variant text-on-surface-variant bg-white hover:bg-surface-container-low'
                    }`}
                  >
                    <BadgeCheck className="h-3 w-3 mr-1" />
                    {(place as any).is_verified ? 'Verified' : 'Verify'}
                  </button>
                  <button
                    onClick={() => window.open(`/place/${(place as any).slug || place.id}`, '_blank')}
                    className="inline-flex items-center justify-center px-3 py-2 border border-outline-variant rounded-md text-xs font-medium text-on-surface-variant bg-white hover:bg-surface-container-low"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => handleDeletePlace(place.id, place.name)}
                    className="inline-flex items-center justify-center px-3 py-2 border border-red-300 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center px-4 py-2 border border-outline-variant rounded-md text-sm font-medium text-on-surface-variant bg-white hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </button>

          <div className="flex items-center space-x-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    currentPage === pageNum
                      ? 'bg-primary text-white'
                      : 'bg-white text-on-surface-variant border border-outline-variant hover:bg-surface-container-low'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center px-4 py-2 border border-outline-variant rounded-md text-sm font-medium text-on-surface-variant bg-white hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      )}

      {/* Create Place Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-outline bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-surface-container-high flex items-center justify-between">
              <h2 className="text-xl font-semibold text-on-surface">Create New Place</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-outline hover:text-outline"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreatePlace} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Place Name *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter place name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter place description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter full address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">
                    Latitude *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.latitude}
                    onChange={(e) => setCreateForm({ ...createForm, latitude: e.target.value })}
                    className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., 40.7128"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">
                    Longitude *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.longitude}
                    onChange={(e) => setCreateForm({ ...createForm, longitude: e.target.value })}
                    className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., -74.0060"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Category *
                </label>
                <select
                  required
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="restaurant">Restaurant</option>
                  <option value="cafe">Cafe</option>
                  <option value="store">Store</option>
                  <option value="market">Market</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-outline-variant rounded-md text-sm font-medium text-on-surface-variant bg-white hover:bg-surface-container-low"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Place'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
