/**
 * Location cookie helpers — kept in one place so every caller that
 * changes the user's location state (pin, unpin, switch to geo, first-time
 * geolocation resolve) also updates the cookies server-side `getInitialLocationData`
 * on the home page reads from.
 *
 * Why cookies: localStorage is invisible to SSR. We mirror the relevant
 * keys to cookies so the server can render the pinned city on the first
 * paint. Browser `storage` events don't fire for same-tab changes, so any
 * UI that mutates localStorage MUST call setLocationCookie / clearPinnedCookies
 * explicitly — otherwise the cookie goes stale and the next SSR shows the
 * wrong city.
 */

const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function writeCookie(name: string, value: string | null) {
  if (typeof document === 'undefined') return
  if (!value) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
    return
  }
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`
}

export const LOCATION_COOKIE_KEYS = {
  pinnedCity: 'pp_pinned_city',
  pinnedCountry: 'pp_pinned_country',
  userLat: 'pp_user_lat',
  userLng: 'pp_user_lng',
  userCity: 'pp_user_city',
  userCountry: 'pp_user_country',
} as const

/** Write the pinned city pair to cookies (or clear if empty). */
export function setPinnedLocationCookies(city: string | null, country: string | null) {
  writeCookie(LOCATION_COOKIE_KEYS.pinnedCity, city)
  writeCookie(LOCATION_COOKIE_KEYS.pinnedCountry, country)
}

/** Clear only the pinned cookies. Geo cookies remain so the home page
    falls back to the user's detected location. */
export function clearPinnedLocationCookies() {
  writeCookie(LOCATION_COOKIE_KEYS.pinnedCity, null)
  writeCookie(LOCATION_COOKIE_KEYS.pinnedCountry, null)
}

/** Write the detected-geo cookies. Used by the geolocation resolver. */
export function setGeoLocationCookies({
  lat, lng, city, country,
}: { lat?: string | null; lng?: string | null; city?: string | null; country?: string | null }) {
  writeCookie(LOCATION_COOKIE_KEYS.userLat, lat ?? null)
  writeCookie(LOCATION_COOKIE_KEYS.userLng, lng ?? null)
  writeCookie(LOCATION_COOKIE_KEYS.userCity, city ?? null)
  writeCookie(LOCATION_COOKIE_KEYS.userCountry, country ?? null)
}

/** Clear all location cookies. Used on logout or "forget my location". */
export function clearAllLocationCookies() {
  clearPinnedLocationCookies()
  writeCookie(LOCATION_COOKIE_KEYS.userLat, null)
  writeCookie(LOCATION_COOKIE_KEYS.userLng, null)
  writeCookie(LOCATION_COOKIE_KEYS.userCity, null)
  writeCookie(LOCATION_COOKIE_KEYS.userCountry, null)
}

/** Idempotent sync from localStorage → cookies. Safe to call anytime;
    mirrors whatever's currently in localStorage. */
export function syncLocationCookiesFromLocalStorage() {
  if (typeof window === 'undefined') return
  setPinnedLocationCookies(
    localStorage.getItem('pinned_city_name'),
    localStorage.getItem('pinned_country_name'),
  )
  setGeoLocationCookies({
    lat: localStorage.getItem('user_lat'),
    lng: localStorage.getItem('user_lng'),
    city: localStorage.getItem('user_city'),
    country: localStorage.getItem('user_country'),
  })
}
