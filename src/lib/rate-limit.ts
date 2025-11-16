/**
 * Simple in-memory rate limiter for API endpoints
 * For production with multiple servers, consider using Redis-based solution like @upstash/ratelimit
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  /**
   * Check if a request should be rate limited
   * @param identifier Unique identifier (e.g., user ID, IP address)
   * @param limit Maximum number of requests allowed
   * @param windowMs Time window in milliseconds
   * @returns Object with success status and remaining requests
   */
  check(
    identifier: string,
    limit: number,
    windowMs: number
  ): { success: boolean; remaining: number; resetIn: number } {
    const now = Date.now()
    const entry = this.storage.get(identifier)

    // No existing entry or entry has expired
    if (!entry || entry.resetTime < now) {
      this.storage.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      })
      return {
        success: true,
        remaining: limit - 1,
        resetIn: windowMs,
      }
    }

    // Entry exists and is still valid
    if (entry.count < limit) {
      entry.count++
      return {
        success: true,
        remaining: limit - entry.count,
        resetIn: entry.resetTime - now,
      }
    }

    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string): void {
    this.storage.delete(identifier)
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.storage.entries()) {
      if (entry.resetTime < now) {
        this.storage.delete(key)
      }
    }
  }

  /**
   * Stop cleanup interval (for testing or shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter()

export default rateLimiter

/**
 * Helper function for rate limiting API routes
 * Usage in API route:
 *
 * import { rateLimit } from '@/lib/rate-limit'
 *
 * const limiter = rateLimit({
 *   identifier: user?.id || ip,
 *   limit: 10,
 *   windowMs: 60 * 60 * 1000, // 1 hour
 * })
 *
 * if (!limiter.success) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 * }
 */
export function rateLimit(config: {
  identifier: string
  limit: number
  windowMs: number
}) {
  return rateLimiter.check(config.identifier, config.limit, config.windowMs)
}

/**
 * Preset rate limiters for common use cases
 */
export const RateLimitPresets = {
  // Post creation: 10 posts per hour
  postCreation: (identifier: string) =>
    rateLimiter.check(identifier, 10, 60 * 60 * 1000),

  // Comment creation: 30 comments per hour
  commentCreation: (identifier: string) =>
    rateLimiter.check(identifier, 30, 60 * 60 * 1000),

  // Likes/reactions: 100 per hour
  reactions: (identifier: string) =>
    rateLimiter.check(identifier, 100, 60 * 60 * 1000),

  // Follow/unfollow: 50 per hour
  followActions: (identifier: string) =>
    rateLimiter.check(identifier, 50, 60 * 60 * 1000),

  // Contact form: 3 submissions per hour
  contactForm: (identifier: string) =>
    rateLimiter.check(identifier, 3, 60 * 60 * 1000),

  // Auth attempts: 5 per 15 minutes
  authAttempts: (identifier: string) =>
    rateLimiter.check(identifier, 5, 15 * 60 * 1000),

  // API general: 100 requests per minute
  apiGeneral: (identifier: string) =>
    rateLimiter.check(identifier, 100, 60 * 1000),
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(request: Request): string {
  const headers = request.headers

  // Check common headers for IP address
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  const cfConnectingIp = headers.get('cf-connecting-ip') // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // Fallback to a default if no IP found
  return 'unknown'
}

