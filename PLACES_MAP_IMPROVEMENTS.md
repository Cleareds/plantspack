# PlantsPack Places/Map - Implementation Improvements

Quick reference guide with code examples for immediate improvements.

## 1. DATABASE INDEXES (15 minutes)

Copy and paste into Supabase SQL editor:

```sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_created_by ON places(created_by);
CREATE INDEX IF NOT EXISTS idx_places_location ON places(latitude, longitude);

-- Prevent duplicate favorites
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorite_places_unique 
  ON favorite_places(user_id, place_id);

CREATE INDEX IF NOT EXISTS idx_favorite_places_user 
  ON favorite_places(user_id);

-- Add constraints for data integrity
ALTER TABLE places
  ADD CONSTRAINT IF NOT EXISTS latitude_range 
    CHECK (latitude >= -90 AND latitude <= 90),
  ADD CONSTRAINT IF NOT EXISTS longitude_range 
    CHECK (longitude >= -180 AND longitude <= 180),
  ADD CONSTRAINT IF NOT EXISTS name_not_empty 
    CHECK (length(trim(name)) > 0);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_place_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS places_update_timestamp 
  BEFORE UPDATE ON places
  FOR EACH ROW
  EXECUTE FUNCTION update_place_timestamp();
```

**Expected Improvement**: 20-30% faster place queries

---

## 2. FIX CIRCULAR DEPENDENCY (30 minutes)

Current problem:
```typescript
// BAD: circular dependency
const fetchPlaces = useCallback(async () => {
  let query = supabase.from('places').select('...')
  if (selectedCategory !== 'all') {
    query = query.eq('category', selectedCategory)
  }
  const { data } = await query
  setPlaces(data || [])
}, [selectedCategory]) // <-- fetchPlaces depends on selectedCategory

useEffect(() => {
  if (authReady) {
    fetchPlaces() // <-- But this effect depends on fetchPlaces
  }
}, [selectedCategory, authReady, fetchPlaces]) // <-- causes infinite loops
```

Fixed version:
```typescript
// GOOD: pass category as parameter
const fetchPlaces = useCallback(async (category?: string) => {
  let query = supabase
    .from('places')
    .select(`
      id,
      name,
      description,
      category,
      latitude,
      longitude,
      address,
      website,
      is_pet_friendly,
      created_by,
      created_at,
      users (username),
      favorite_places (id, user_id)
    `)
    .order('created_at', { ascending: false })

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching places:', error)
    setError(error.message)
  } else {
    setPlaces(data || [])
  }
  
  setLoading(false)
}, []) // <-- No dependencies!

useEffect(() => {
  if (authReady) {
    fetchPlaces(selectedCategory) // <-- Pass as parameter
  }
}, [selectedCategory, authReady, fetchPlaces])
```

**Expected Improvement**: Eliminates extra renders, snappier category switching

---

## 3. SEARCH RESULT CACHING (1 hour)

Create new file: `src/utils/nominatimCache.ts`

```typescript
interface CacheEntry {
  results: any[]
  timestamp: number
}

class AddressSearchCache {
  private cache = new Map<string, CacheEntry>()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes

  private isCacheExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.TTL
  }

  async search(query: string): Promise<any[]> {
    // Check cache
    if (this.cache.has(query)) {
      const entry = this.cache.get(query)!
      if (!this.isCacheExpired(entry)) {
        return entry.results
      }
      this.cache.delete(query) // Remove stale entry
    }

    // Fetch new results
    try {
      const response = await this.fetchWithTimeout(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&extratags=1&namedetails=1&bounded=0&dedupe=1`,
        5000 // 5 second timeout
      )

      const results = await response.json()

      // Cache results
      this.cache.set(query, {
        results,
        timestamp: Date.now()
      })

      return results
    } catch (error) {
      console.error('Address search error:', error)
      return []
    }
  }

  private async fetchWithTimeout(
    url: string,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  clear(): void {
    this.cache.clear()
  }
}

export const addressSearchCache = new AddressSearchCache()
```

Usage in Map.tsx:
```typescript
import { addressSearchCache } from '@/utils/nominatimCache'

const searchAddresses = useCallback(async (query: string) => {
  if (query.length < 3) {
    setSearchResults([])
    setShowSearchResults(false)
    return
  }

  try {
    const results = await addressSearchCache.search(query) // Use cache
    setSearchResults(results)
    setShowSearchResults(true)
  } catch (error) {
    console.error('Error searching addresses:', error)
    setSearchResults([])
    setShowSearchResults(false)
  }
}, [])
```

**Expected Improvement**: Eliminates duplicate API calls, faster UX for repeated searches

---

## 4. COMPONENT EXTRACTION

Create new files to break up the monolithic Map.tsx:

### `src/components/map/MapControls.tsx`
```typescript
'use client'

import { Search, Plus } from 'lucide-react'
import Link from 'next/link'

interface MapControlsProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  searchRadius: number
  onRadiusChange: (radius: number) => void
  customCenter: [number, number] | null
  onResetCenter: () => void
  user: any
  onAddPlace: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  searchResults: any[]
  onSearchSelect: (result: any) => void
  showSearchResults: boolean
}

export default function MapControls({
  selectedCategory,
  onCategoryChange,
  searchRadius,
  onRadiusChange,
  customCenter,
  onResetCenter,
  user,
  onAddPlace,
  searchQuery,
  onSearchChange,
  searchResults,
  onSearchSelect,
  showSearchResults
}: MapControlsProps) {
  const categories = [
    { value: 'all', label: 'All Places' },
    { value: 'restaurant', label: 'Restaurants' },
    { value: 'event', label: 'Events' },
    { value: 'museum', label: 'Museums' },
    { value: 'other', label: 'Other' }
  ]

  return (
    <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
      <div className="max-w-full mx-auto flex items-center justify-between gap-4">
        {/* Category and Radius Selection */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">Vegan Places</h1>
          
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Radius:</span>
            <select
              value={searchRadius}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {[5, 10, 25, 50, 100, 200].map((r) => (
                <option key={r} value={r}>{r}km</option>
              ))}
            </select>
          </div>

          {customCenter && (
            <button
              onClick={onResetCenter}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border"
            >
              Reset Center
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-4 relative search-container">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search for places..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
          </div>

          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg mt-1 z-50 max-h-60 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => onSearchSelect(result)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                >
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {result.display_name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add Place Button */}
        {user ? (
          <button
            onClick={onAddPlace}
            className="flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Place</span>
          </button>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Sign up to add places</p>
            <Link 
              href="/auth" 
              className="inline-flex items-center space-x-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Sign Up</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
```

### `src/components/map/PlacesSidebar.tsx`
```typescript
'use client'

import { Heart, PawPrint, MapPin } from 'lucide-react'

interface Place {
  id: string
  name: string
  category: string
  address: string
  description?: string
  is_pet_friendly: boolean
  distance: number
  favorite_places: Array<{ id: string; user_id: string }>
}

interface PlacesSidebarProps {
  places: Place[]
  loading: boolean
  searchRadius: number
  user: any
  onSelectPlace: (place: Place) => void
  onToggleFavorite: (placeId: string) => void
}

export default function PlacesSidebar({
  places,
  loading,
  searchRadius,
  user,
  onSelectPlace,
  onToggleFavorite
}: PlacesSidebarProps) {
  const hasNearbyPlaces = places.length > 0

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto z-20">
      <div className="p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          Places within {searchRadius}km
        </h2>

        {!hasNearbyPlaces ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No places found within {searchRadius}km radius.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {places.map((place) => (
              <div
                key={place.id}
                className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onSelectPlace(place)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{place.name}</h3>
                  {user && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleFavorite(place.id)
                      }}
                      className={`p-1 rounded ${
                        place.favorite_places.some(f => f.user_id === user.id)
                          ? 'text-red-600'
                          : 'text-gray-400 hover:text-red-600'
                      }`}
                    >
                      <Heart className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs capitalize">
                      {place.category}
                    </span>
                    {place.is_pet_friendly && (
                      <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs flex items-center space-x-1">
                        <PawPrint className="h-3 w-3" />
                        <span>Pet Friendly</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{place.address}</p>
                  <p className="text-xs text-gray-400">
                    {place.distance.toFixed(1)}km away
                  </p>
                  {place.description && (
                    <p className="text-xs text-gray-700 line-clamp-2">{place.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Expected Improvement**: Prevents full re-renders when unrelated state changes

---

## 5. FORM VALIDATION (1 hour)

Create `src/utils/placeValidation.ts`:

```typescript
export interface ValidationError {
  field: string
  message: string
}

export interface NewPlace {
  name: string
  category: 'restaurant' | 'event' | 'museum' | 'other'
  address: string
  description: string
  website: string
  is_pet_friendly: boolean
  latitude: number
  longitude: number
}

export function validatePlace(place: Partial<NewPlace>): ValidationError[] {
  const errors: ValidationError[] = []

  // Name validation
  if (!place.name?.trim()) {
    errors.push({ field: 'name', message: 'Place name is required' })
  } else if (place.name.length < 2) {
    errors.push({ field: 'name', message: 'Place name must be at least 2 characters' })
  } else if (place.name.length > 100) {
    errors.push({ field: 'name', message: 'Place name cannot exceed 100 characters' })
  }

  // Category validation
  const validCategories = ['restaurant', 'event', 'museum', 'other']
  if (place.category && !validCategories.includes(place.category)) {
    errors.push({ field: 'category', message: 'Invalid category' })
  }

  // Address and coordinates validation
  if (!place.address?.trim()) {
    errors.push({ field: 'address', message: 'Address is required. Please select from search results.' })
  }

  if (place.latitude === undefined || place.longitude === undefined) {
    errors.push({ field: 'address', message: 'Please select an address from the search results' })
  } else if (!isValidCoordinates(place.latitude, place.longitude)) {
    errors.push({ field: 'address', message: 'Invalid coordinates' })
  }

  // Description validation (optional but if provided, check length)
  if (place.description && place.description.length > 500) {
    errors.push({ field: 'description', message: 'Description cannot exceed 500 characters' })
  }

  // Website validation (optional)
  if (place.website && !isValidUrl(place.website)) {
    errors.push({ field: 'website', message: 'Please enter a valid URL' })
  }

  return errors
}

function isValidCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`)
    return true
  } catch {
    return false
  }
}

export function getFieldError(errors: ValidationError[], field: string): string | null {
  const error = errors.find(e => e.field === field)
  return error?.message || null
}
```

Usage in form:
```typescript
const handleAddPlace = async (e: React.FormEvent) => {
  e.preventDefault()

  // Validate
  const errors = validatePlace(newPlace)
  if (errors.length > 0) {
    setFormErrors(errors)
    return
  }

  // Check for duplicates (optional)
  const duplicate = await checkForDuplicate(newPlace)
  if (duplicate.isDuplicate) {
    setFormErrors([{
      field: 'address',
      message: `A similar place might already exist: ${duplicate.existingPlace.name}`
    }])
    return
  }

  // Submit
  try {
    const { error } = await supabase
      .from('places')
      .insert({ ...newPlace, created_by: user.id })

    if (error) throw error

    // Success
    showToast('Place added successfully!')
    setShowAddForm(false)
    setNewPlace(defaultNewPlace)
    fetchPlaces()
  } catch (error) {
    setFormErrors([{
      field: 'general',
      message: 'Failed to add place. Please try again.'
    }])
    console.error('Error adding place:', error)
  }
}
```

**Expected Improvement**: Better UX with field-specific error messages

---

## 6. OPTIMISTIC UPDATES (45 minutes)

```typescript
import { nanoid } from 'nanoid'

const toggleFavorite = async (placeId: string) => {
  if (!user) return

  const place = places.find(p => p.id === placeId)
  if (!place) return

  const isFavorited = place.favorite_places.some(f => f.user_id === user.id)

  // Optimistic update: update UI immediately
  const updatedPlaces = places.map(p => {
    if (p.id === placeId) {
      return {
        ...p,
        favorite_places: isFavorited
          ? p.favorite_places.filter(f => f.user_id !== user.id)
          : [...p.favorite_places, { id: nanoid(), user_id: user.id }]
      }
    }
    return p
  })

  const previousPlaces = places // Save for rollback
  setPlaces(updatedPlaces)

  try {
    if (isFavorited) {
      // Remove favorite
      const { error } = await supabase
        .from('favorite_places')
        .delete()
        .eq('place_id', placeId)
        .eq('user_id', user.id)

      if (error) throw error
    } else {
      // Add favorite
      const { error } = await supabase
        .from('favorite_places')
        .insert({ place_id: placeId, user_id: user.id })

      if (error) throw error
    }

    // Success - UI is already updated
  } catch (error) {
    // Rollback optimistic update on error
    setPlaces(previousPlaces)
    showToast(`Failed to ${isFavorited ? 'remove' : 'add'} favorite`, 'error')
    console.error('Error toggling favorite:', error)
  }
}
```

**Expected Improvement**: Instant UI feedback, feels faster even with network latency

---

## Summary of Changes

| Change | Time | Effort | Impact |
|--------|------|--------|--------|
| Database indexes | 15 min | Very Low | Very High |
| Fix circular dep | 30 min | Low | High |
| Search caching | 1 hour | Medium | High |
| Component extraction | 2-3 hours | High | Very High |
| Form validation | 1 hour | Medium | Medium |
| Optimistic updates | 45 min | Medium | High |

**Total time for all improvements: ~6-7 hours**

Focus on the top 3-4 items first for maximum impact!
