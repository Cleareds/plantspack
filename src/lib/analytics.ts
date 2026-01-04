/**
 * Google Analytics utility functions
 * Optimized for performance with lazy loading and production-only tracking
 */

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, any>
    ) => void
    dataLayer?: any[]
  }
}

const GA_MEASUREMENT_ID = 'G-402EVF2GP0'

/**
 * Check if analytics is available and we're in production
 */
function isAnalyticsAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'production' &&
    typeof window.gtag === 'function'
  )
}

/**
 * Track page views
 * Automatically called on route changes
 */
export function trackPageView(url: string): void {
  if (!isAnalyticsAvailable()) return

  try {
    window.gtag?.('config', GA_MEASUREMENT_ID, {
      page_path: url,
      send_page_view: true,
    })
  } catch (error) {
    // Silently fail to avoid breaking the app
    if (process.env.NODE_ENV === 'development') {
      console.warn('Analytics tracking failed:', error)
    }
  }
}

/**
 * Track custom events
 * @param action - Event action (e.g., 'click', 'submit', 'share')
 * @param category - Event category (e.g., 'button', 'form', 'video')
 * @param label - Event label (optional)
 * @param value - Event value (optional, numeric)
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
): void {
  if (!isAnalyticsAvailable()) return

  try {
    window.gtag?.('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  } catch (error) {
    // Silently fail
    if (process.env.NODE_ENV === 'development') {
      console.warn('Event tracking failed:', error)
    }
  }
}

/**
 * Track user timing for performance monitoring
 * @param name - Timing variable name
 * @param value - Time in milliseconds
 * @param category - Optional category
 */
export function trackTiming(
  name: string,
  value: number,
  category?: string
): void {
  if (!isAnalyticsAvailable()) return

  try {
    window.gtag?.('event', 'timing_complete', {
      name,
      value,
      event_category: category || 'Performance',
    })
  } catch (error) {
    // Silently fail
  }
}

/**
 * Track exceptions/errors
 * @param description - Error description
 * @param fatal - Whether the error is fatal
 */
export function trackException(description: string, fatal = false): void {
  if (!isAnalyticsAvailable()) return

  try {
    window.gtag?.('event', 'exception', {
      description,
      fatal,
    })
  } catch (error) {
    // Silently fail
  }
}
