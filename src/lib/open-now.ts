// "Open now" for places outside the viewer's own time zone. The shared parser
// (src/shared/opening-hours.ts) reads the day and minutes of the Date it is
// given in the runtime's local zone, so for a hub in Berlin viewed from
// Toronto we hand it a Date whose local wall-clock equals Berlin's wall-clock.
// Safe for both server and client (Intl only, no lookup table).
import { openStatus, openLabel, type OpenStatus } from '@/shared/opening-hours'

export type { OpenStatus }
export { openLabel }

const fmtCache = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat | null {
  let f = fmtCache.get(timeZone)
  if (f) return f
  try {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
    })
  } catch {
    return null
  }
  fmtCache.set(timeZone, f)
  return f
}

/** A Date whose local wall-clock components equal the current time in `timeZone`. */
export function nowIn(timeZone: string | null | undefined, at: Date = new Date()): Date {
  if (!timeZone) return at
  const f = formatterFor(timeZone)
  if (!f) return at
  const parts: Record<string, number> = {}
  for (const p of f.formatToParts(at)) if (p.type !== 'literal') parts[p.type] = Number(p.value)
  return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
}

/** Open state of an OSM opening_hours string at the current time in the place's zone. */
export function openStatusIn(raw: string | null | undefined, timeZone: string | null | undefined, at: Date = new Date()): OpenStatus {
  if (!raw) return { state: 'unknown' }
  return openStatus(raw, nowIn(timeZone, at))
}

/** The OSM-format hours string of a row, whatever shape the column arrived in. */
export function hoursStringOf(opening_hours: unknown): string | null {
  return typeof opening_hours === 'string' && opening_hours.trim() ? opening_hours : null
}
