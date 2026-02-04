/**
 * Centralized geocoding service with rate limiting and caching
 * Complies with Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
 */

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
  address?: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    state?: string
    region?: string
    country?: string
  }
}

interface GeocodingCache {
  [key: string]: {
    data: NominatimResult[]
    timestamp: number
  }
}

class GeocodingService {
  private cache: GeocodingCache = {}
  private lastRequestTime = 0
  private readonly MIN_REQUEST_INTERVAL = 1000 // 1 second in milliseconds
  private readonly CACHE_DURATION = 1000 * 60 * 60 // 1 hour
  private readonly USER_AGENT = 'PlantsPack/1.0 (https://plantspack.com)'

  /**
   * Wait for rate limit compliance (1 request per second)
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    this.lastRequestTime = Date.now()
  }

  /**
   * Get cached results if available and not expired
   */
  private getCached(cacheKey: string): NominatimResult[] | null {
    const cached = this.cache[cacheKey]
    if (!cached) return null

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION
    if (isExpired) {
      delete this.cache[cacheKey]
      return null
    }

    return cached.data
  }

  /**
   * Cache results
   */
  private setCache(cacheKey: string, data: NominatimResult[]): void {
    this.cache[cacheKey] = {
      data,
      timestamp: Date.now()
    }
  }

  /**
   * Search for locations by query string
   * @param query - Search query (e.g., "Berlin, Germany")
   * @param options - Additional search options
   * @returns Array of location results
   */
  async search(
    query: string,
    options: {
      limit?: number
      addressDetails?: boolean
      extraTags?: boolean
      nameDetails?: boolean
    } = {}
  ): Promise<NominatimResult[]> {
    if (query.length < 3) {
      return []
    }

    const {
      limit = 8,
      addressDetails = true,
      extraTags = false,
      nameDetails = false
    } = options

    // Create cache key
    const cacheKey = `search:${query}:${limit}:${addressDetails}:${extraTags}:${nameDetails}`

    // Check cache first
    const cached = this.getCached(cacheKey)
    if (cached) {
      return cached
    }

    // Wait for rate limit
    await this.waitForRateLimit()

    try {
      const params = new URLSearchParams({
        format: 'json',
        q: query,
        limit: limit.toString(),
        addressdetails: addressDetails ? '1' : '0',
        extratags: extraTags ? '1' : '0',
        namedetails: nameDetails ? '1' : '0',
        bounded: '0',
        dedupe: '1'
      })

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          headers: {
            'User-Agent': this.USER_AGENT
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`)
      }

      const data: NominatimResult[] = await response.json()

      // Cache the results
      this.setCache(cacheKey, data)

      return data
    } catch (error) {
      console.error('Geocoding search error:', error)
      return []
    }
  }

  /**
   * Reverse geocode coordinates to location
   * @param lat - Latitude
   * @param lon - Longitude
   * @returns Location result or null
   */
  async reverse(lat: number, lon: number): Promise<NominatimResult | null> {
    const cacheKey = `reverse:${lat.toFixed(6)}:${lon.toFixed(6)}`

    // Check cache first
    const cached = this.getCached(cacheKey)
    if (cached && cached.length > 0) {
      return cached[0]
    }

    // Wait for rate limit
    await this.waitForRateLimit()

    try {
      const params = new URLSearchParams({
        format: 'json',
        lat: lat.toString(),
        lon: lon.toString(),
        addressdetails: '1'
      })

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
        {
          headers: {
            'User-Agent': this.USER_AGENT
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`)
      }

      const data: NominatimResult = await response.json()

      // Cache the result
      this.setCache(cacheKey, [data])

      return data
    } catch (error) {
      console.error('Geocoding reverse error:', error)
      return null
    }
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache = {}
  }

  /**
   * Clear expired cache entries
   */
  cleanCache(): void {
    const now = Date.now()
    Object.keys(this.cache).forEach(key => {
      if (now - this.cache[key].timestamp > this.CACHE_DURATION) {
        delete this.cache[key]
      }
    })
  }
}

// Export singleton instance
export const geocodingService = new GeocodingService()

// Clean cache every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    geocodingService.cleanCache()
  }, 10 * 60 * 1000)
}
