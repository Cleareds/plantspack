/**
 * Database-backed rate limiter using Supabase
 * Replaces in-memory rate limiting for production serverless environments
 */

import { createClient } from '@supabase/supabase-js'

interface RateLimitResult {
  success: boolean
  remaining: number
  resetIn: number
  limit: number
  current: number
}

/**
 * Check rate limit using database-backed storage
 * This is durable across serverless instances and restarts
 */
export async function checkRateLimit(
  identifier: string,
  action: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    // Create admin client for rate limit checks
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action: action,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds
    })

    if (error) {
      console.error('[Rate Limit] Database error:', error)
      // Fail open on database errors to avoid blocking users
      return {
        success: true,
        remaining: maxRequests,
        resetIn: windowSeconds * 1000,
        limit: maxRequests,
        current: 0
      }
    }

    const result = data as {
      allowed: boolean
      current: number
      limit: number
      remaining?: number
      reset_at: string
      retry_after?: number
    }

    const resetAt = new Date(result.reset_at)
    const resetIn = Math.max(0, resetAt.getTime() - Date.now())

    return {
      success: result.allowed,
      remaining: result.remaining || 0,
      resetIn,
      limit: result.limit,
      current: result.current
    }
  } catch (error) {
    console.error('[Rate Limit] Unexpected error:', error)
    // Fail open on unexpected errors
    return {
      success: true,
      remaining: maxRequests,
      resetIn: windowSeconds * 1000,
      limit: maxRequests,
      current: 0
    }
  }
}

/**
 * Helper function for rate limiting API routes
 * Usage in API route:
 *
 * import { rateLimit } from '@/lib/rate-limit-db'
 *
 * const limiter = await rateLimit({
 *   identifier: user?.id || ip,
 *   action: 'post_creation',
 *   limit: 10,
 *   windowSeconds: 3600,
 * })
 *
 * if (!limiter.success) {
 *   return NextResponse.json(
 *     { error: 'Too many requests. Please try again later.' },
 *     {
 *       status: 429,
 *       headers: {
 *         'Retry-After': Math.ceil(limiter.resetIn / 1000).toString()
 *       }
 *     }
 *   )
 * }
 */
export async function rateLimit(config: {
  identifier: string
  action: string
  limit: number
  windowSeconds: number
}): Promise<RateLimitResult> {
  return checkRateLimit(
    config.identifier,
    config.action,
    config.limit,
    config.windowSeconds
  )
}

/**
 * Preset rate limiters for common use cases
 * All using database-backed storage
 */
export const RateLimitPresets = {
  // Post creation: 10 posts per hour
  postCreation: (identifier: string) =>
    checkRateLimit(identifier, 'post_creation', 10, 3600),

  // Comment creation: 30 comments per hour
  commentCreation: (identifier: string) =>
    checkRateLimit(identifier, 'comment_creation', 30, 3600),

  // Likes/reactions: 100 per hour
  reactions: (identifier: string) =>
    checkRateLimit(identifier, 'reactions', 100, 3600),

  // Follow/unfollow: 50 per hour
  followActions: (identifier: string) =>
    checkRateLimit(identifier, 'follow_actions', 50, 3600),

  // Contact form: 3 submissions per hour
  contactForm: (identifier: string) =>
    checkRateLimit(identifier, 'contact_form', 3, 3600),

  // Auth attempts: 5 per 15 minutes
  authAttempts: (identifier: string) =>
    checkRateLimit(identifier, 'auth_attempts', 5, 900),

  // API general: 100 requests per minute
  apiGeneral: (identifier: string) =>
    checkRateLimit(identifier, 'api_general', 100, 60),

  // Pack creation: 5 packs per hour
  packCreation: (identifier: string) =>
    checkRateLimit(identifier, 'pack_creation', 5, 3600),

  // Place creation: 10 places per hour
  placeCreation: (identifier: string) =>
    checkRateLimit(identifier, 'place_creation', 10, 3600),
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
