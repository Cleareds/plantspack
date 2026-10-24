// Server-only: IANA time zone for a coordinate. @photostructure/tz-lookup is
// an 88 KB lookup table; keep it out of client bundles (import this module
// from server components and route handlers only, pass the string down).
import tzLookup from '@photostructure/tz-lookup'

export function timeZoneFor(lat: number | null | undefined, lng: number | null | undefined): string | null {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  try {
    return tzLookup(lat, lng)
  } catch {
    return null
  }
}
