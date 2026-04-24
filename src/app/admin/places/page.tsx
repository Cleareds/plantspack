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
  slug: string | null
  name: string
  description: string | null
  address: string
  city: string | null
  country: string | null
  latitude: number
  longitude: number
  category: string
  vegan_level: string | null
  is_verified: boolean
  rating: number | null
  created_by: string
  created_at: string
  users: { username: string } | null
}

const PLACES_PER_PAGE = 20

export default function PlacesManagement() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPlaces, setTotalPlaces] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterVeganLevel, setFilterVeganLevel] = useState<string>('all')
  const [filterUserId, setFilterUserId] = useState<string>('all')
  const [contributors, setContributors] = useState<{ id: string; username: string; count: number }[]>([])
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
  const [ownerModal, setOwnerModal] = useState<{ placeId: string; placeName: string } | null>(null)
  const [ownerUsername, setOwnerUsername] = useState('')
  const [assigningOwner, setAssigningOwner] = useState(false)

  // Load contributor list once on mount
  useEffect(() => {
    fetch('/api/admin/contributors')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setContributors(data) })
      .catch(() => {})
  }, [])

  const loadPlaces = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('places')
        .select('id, slug, name, description, address, city, country, category, vegan_level, is_verified, average_rating, created_by, created_at, users(username)', { count: 'exact' })
        .is('archived_at', null)

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
      }
      if (filterCategory !== 'all') query = query.eq('category', filterCategory)
      if (filterVeganLevel !== 'all') query = query.eq('vegan_level', filterVeganLevel)
      if (filterUserId !== 'all') query = query.eq('created_by', filterUserId)

      const from = (currentPage - 1) * PLACES_PER_PAGE
      const to = from + PLACES_PER_PAGE - 1
      query = query.range(from, to).order('created_at', { ascending: false })

      const { data, error, count } = await query
      if (error) throw error

      setPlaces((data as any) || [])
      setTotalPlaces(count || 0)
    } catch (error) {
      console.error('Error loading places:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, filterCategory, filterVeganLevel, filterUserId])

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

  const handleAssignOwner = async () => {
    if (!ownerModal || !ownerUsername.trim()) return
    setAssigningOwner(true)
    try {
      // Find user by username
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', ownerUsername.trim())
        .single()

      if (userErr || !user) {
        alert(`User "${ownerUsername}" not found`)
        return
      }

      // Check if already owner
      const { data: existing } = await supabase
        .from('place_owners')
        .select('id')
        .eq('place_id', ownerModal.placeId)
        .eq('user_id', user.id)
        .is('removed_at', null)
        .maybeSingle()

      if (existing) {
        alert(`${user.username} is already the owner of this place`)
        return
      }

      // Remove any existing owner first
      await supabase
        .from('place_owners')
        .update({ removed_at: new Date().toISOString() })
        .eq('place_id', ownerModal.placeId)
        .is('removed_at', null)

      // Insert new owner
      const { error } = await supabase
        .from('place_owners')
        .insert({
          place_id: ownerModal.placeId,
          user_id: user.id,
          verified_by: user.id,
        })

      if (error) throw error

      alert(`${user.username} is now the verified owner of "${ownerModal.placeName}"`)
      setOwnerModal(null)
      setOwnerUsername('')
    } catch (error: any) {
      alert(error?.message || 'Failed to assign owner')
    } finally {
      setAssigningOwner(false)
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-outline" />
              <input
                type="text"
                placeholder="Name, address, or city..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Vegan Level</label>
            <select
              value={filterVeganLevel}
              onChange={(e) => { setFilterVeganLevel(e.target.value); setCurrentPage(1) }}
              className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Levels</option>
              <option value="fully_vegan">100% Vegan</option>
              <option value="mostly_vegan">Mostly Vegan</option>
              <option value="vegan_friendly">Vegan-Friendly</option>
              <option value="vegan_options">Has Vegan Options</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1) }}
              className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="eat">Eat</option>
              <option value="store">Store</option>
              <option value="hotel">Stay</option>
              <option value="event">Event</option>
              <option value="organisation">Organisation</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">
            Added by user {contributors.length > 0 && <span className="text-outline font-normal">({contributors.length} contributors)</span>}
          </label>
          <select
            value={filterUserId}
            onChange={(e) => { setFilterUserId(e.target.value); setCurrentPage(1) }}
            className="w-full max-w-xs px-3 py-2 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All users</option>
            {contributors.map(u => (
              <option key={u.id} value={u.id}>@{u.username} ({u.count})</option>
            ))}
          </select>
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
            <div key={place.id} className="bg-white rounded-lg shadow p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-on-surface truncate">{place.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-xs text-outline capitalize bg-surface-container-low px-1.5 py-0.5 rounded">{place.category}</span>
                    {place.vegan_level && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        place.vegan_level === 'fully_vegan'    ? 'bg-emerald-100 text-emerald-700' :
                        place.vegan_level === 'mostly_vegan'   ? 'bg-teal-100 text-teal-700' :
                        place.vegan_level === 'vegan_friendly' ? 'bg-amber-100 text-amber-700' :
                        'bg-stone-100 text-stone-600'
                      }`}>
                        {{
                          fully_vegan: '100% Vegan',
                          mostly_vegan: 'Mostly Vegan',
                          vegan_friendly: 'Vegan-Friendly',
                          vegan_options: 'Has Options',
                        }[place.vegan_level] ?? place.vegan_level}
                      </span>
                    )}
                    {place.is_verified && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Verified</span>
                    )}
                  </div>
                </div>
                {(place as any).average_rating > 0 && (
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded flex-shrink-0">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-current" />
                    <span className="text-xs font-medium text-yellow-900">{((place as any).average_rating as number).toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-on-surface-variant space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{[place.city, place.country].filter(Boolean).join(', ') || place.address}</span>
                </div>
                {place.description && (
                  <p className="line-clamp-2 pl-4.5 text-outline">{place.description}</p>
                )}
              </div>

              <div className="pt-2 border-t flex items-center justify-between">
                <div className="text-xs text-outline">
                  <button
                    className="hover:text-primary transition-colors"
                    onClick={() => {
                      const c = contributors.find(u => u.username === place.users?.username)
                      if (c) { setFilterUserId(c.id); setCurrentPage(1) }
                    }}
                    title="Filter by this user"
                  >
                    @{place.users?.username || 'unknown'}
                  </button>
                  <span className="mx-1">·</span>
                  <span>{new Date(place.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={async () => {
                      const newVal = !place.is_verified
                      await supabase.from('places').update({ is_verified: newVal }).eq('id', place.id)
                      setPlaces(prev => prev.map(p => p.id === place.id ? { ...p, is_verified: newVal } : p))
                    }}
                    className={`px-2 py-1 border rounded text-xs font-medium ${
                      place.is_verified ? 'border-primary text-primary bg-primary/10' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                    }`}
                  >
                    <BadgeCheck className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => window.open(`/place/${place.slug || place.id}`, '_blank')}
                    className="px-2 py-1 border border-outline-variant rounded text-xs text-on-surface-variant hover:bg-surface-container-low"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setOwnerModal({ placeId: place.id, placeName: place.name })}
                    className="px-2 py-1 border border-outline-variant rounded text-xs text-on-surface-variant hover:bg-surface-container-low"
                  >
                    Owner
                  </button>
                  <button
                    onClick={() => handleDeletePlace(place.id, place.name)}
                    className="px-2 py-1 border border-red-200 rounded text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
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

      {/* Assign Owner Modal */}
      {ownerModal && (
        <div className="fixed inset-0 bg-outline bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-on-surface">Assign Owner</h2>
              <button onClick={() => { setOwnerModal(null); setOwnerUsername('') }} className="text-outline hover:text-on-surface">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-on-surface-variant">
                Assign a verified owner to <strong>{ownerModal.placeName}</strong>. The user will get an owner badge and edit permissions.
              </p>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Username</label>
                <input
                  type="text"
                  value={ownerUsername}
                  onChange={(e) => setOwnerUsername(e.target.value)}
                  placeholder="e.g. kathi_flowerista"
                  className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setOwnerModal(null); setOwnerUsername('') }}
                  className="px-4 py-2 border border-outline-variant rounded-md text-sm font-medium text-on-surface-variant hover:bg-surface-container-low"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignOwner}
                  disabled={!ownerUsername.trim() || assigningOwner}
                  className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary disabled:opacity-50"
                >
                  {assigningOwner ? 'Assigning...' : 'Assign Owner'}
                </button>
              </div>
            </div>
          </div>
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
