// Tap-target contract shared by the admin broadcast, the web bell and the
// mobile app (mirrored in mobileapp/src/lib/links.ts — keep both in sync).
//
//   plantspack://update   mobile: in-app update screen · web: /app
//   plantspack://<path>   mobile: in-app route /<path> · web: /<path>
//   /path                 in-app route on the current surface
//   https://...           web: navigate · mobile: deep-link or in-app browser

export const APP_UPDATE_URL = 'plantspack://update'
const APP_SCHEME = 'plantspack://'

// Server-side validation for the broadcast route. Returns the normalised url
// or null when the value is not an accepted form.
export function normalizeNotificationUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim()
  if (!v) return null
  if (v.length > 2048) return null
  if (v.startsWith(APP_SCHEME)) return v
  if (v.startsWith('/') && !v.startsWith('//')) return v
  if (/^https:\/\/[^\s]+$/i.test(v)) return v
  return null
}

// Web href for a stored notification url. App-only targets fall back to the
// app landing page so the bell row still goes somewhere useful.
export function webHrefForNotificationUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url === APP_UPDATE_URL) return '/app'
  if (url.startsWith(APP_SCHEME)) return '/' + url.slice(APP_SCHEME.length).replace(/^\/+/, '')
  return url
}
