/**
 * Opening hours, OpenStreetMap text format, as stored in places.opening_hours:
 *   "Mo-Fr 11:00-22:00; Sa,Su 12:00-23:00"   "Mo-Su 12:00-00:00"   "24/7"
 *   "Tu-Sa 17:00-23:00"   "Mo-Su,PH 11:30-20:00; We off"   "Mo-Fr 11:00-24:00"
 *
 * Shared by the website and the app. Deliberately small: it answers "open
 * right now?" and "until when?" for the common forms, and says 'unknown' for
 * anything it does not fully understand (month ranges, week numbers, "sunrise",
 * open-ended "12:00+", comments). Unknown is never shown as closed.
 *
 * Time zone: the caller passes a Date; the day and minutes are read in the
 * runtime's local zone. Only use it for places in the viewer's own time zone
 * (nearby places), or pass a Date already shifted to the place's zone.
 */

export type OpenState = 'open' | 'closed' | 'unknown'

export interface OpenStatus {
  state: OpenState
  /** "22:00" when open and the closing time is known. */
  closesAt?: string
  /** "11:00" when closed and the next opening today or tomorrow is known. */
  opensAt?: string
  /** True when the next opening is tomorrow. */
  opensTomorrow?: boolean
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const
const DAY_INDEX: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 }

/** Minutes since midnight; closing times may exceed 1440 when a range crosses midnight. */
type Range = { start: number; end: number }
/** day index (0 = Sunday) -> ranges; a day with [] or absent is closed. */
type Week = Map<number, Range[]>

const UNSUPPORTED = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|week|sunrise|sunset|dawn|dusk|easter)\b|\d{4}|\+|"|\[/i

/**
 * Parse an OSM opening_hours string into a weekly table.
 * Returns null when any part is outside the supported subset.
 */
export function parseOpeningHours(raw: string | null | undefined): Week | null {
  if (!raw) return null
  const text = String(raw).trim()
  if (!text) return null
  if (/^24\s*\/\s*7$/.test(text)) {
    const week: Week = new Map()
    for (let d = 0; d < 7; d++) week.set(d, [{ start: 0, end: 1440 }])
    return week
  }
  if (UNSUPPORTED.test(text)) return null

  const week: Week = new Map()
  const rules = text.split(/\s*;\s*|\s*\|\|\s*/).filter(Boolean)
  for (const rule of rules) {
    const parsed = parseRule(rule)
    if (!parsed) return null
    const { days, ranges } = parsed
    // Later rules override earlier ones for the days they name (OSM semantics).
    for (const d of days) week.set(d, ranges)
  }
  return week.size ? week : null
}

function parseRule(rule: string): { days: number[]; ranges: Range[] } | null {
  let rest = rule.trim().replace(/\s+/g, ' ')
  if (!rest) return null
  // Strip holiday selectors: we cannot know whether today is a public holiday.
  rest = rest.replace(/,?\b(PH|SH)\b,?/gi, (m) => (m.startsWith(',') && m.endsWith(',') ? ',' : '')).replace(/^,|,(?=\s|$)/g, '').trim()
  if (!rest) return null

  let days: number[] = []
  const dayMatch = rest.match(/^((?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?)(?:,(?:(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:-(?:Mo|Tu|We|Th|Fr|Sa|Su))?))*)\s*(.*)$/)
  if (dayMatch) {
    for (const part of dayMatch[1].split(',')) {
      const [a, b] = part.split('-')
      const from = DAY_INDEX[a]
      const to = b ? DAY_INDEX[b] : from
      if (from == null || to == null) return null
      let d = from
      days.push(d)
      while (d !== to) { d = (d + 1) % 7; days.push(d) }
    }
    rest = dayMatch[2].trim()
  } else {
    days = [0, 1, 2, 3, 4, 5, 6]
  }

  if (!rest || /^(off|closed)$/i.test(rest)) return { days, ranges: [] }
  if (/^open$/i.test(rest)) return { days, ranges: [{ start: 0, end: 1440 }] }

  const ranges: Range[] = []
  for (const span of rest.split(',')) {
    const m = span.trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/)
    if (!m) return null
    const start = Number(m[1]) * 60 + Number(m[2])
    let end = Number(m[3]) * 60 + Number(m[4])
    if (start > 1440 || end > 1440 + 12 * 60) return null
    if (end <= start) end += 1440 // crosses midnight ("18:00-02:00", "12:00-00:00")
    ranges.push({ start, end })
  }
  return { days, ranges }
}

const fmt = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Open state at `at` (default now), read in the runtime's local time zone. */
export function openStatus(raw: string | null | undefined, at: Date = new Date()): OpenStatus {
  const week = parseOpeningHours(raw)
  if (!week) return { state: 'unknown' }
  const day = at.getDay()
  const minutes = at.getHours() * 60 + at.getMinutes()

  // Today's ranges, plus yesterday's ranges that run past midnight.
  const today = week.get(day)
  const yesterday = week.get((day + 6) % 7) ?? []
  for (const r of yesterday) {
    if (r.end > 1440 && minutes < r.end - 1440) return { state: 'open', closesAt: fmt(r.end) }
  }
  // A weekday the string never mentions is closed (OSM semantics).
  const ranges = today ?? []
  for (const r of ranges) {
    if (minutes >= r.start && minutes < r.end) return { state: 'open', closesAt: fmt(r.end) }
  }
  // Closed: find the next opening today, else tomorrow.
  const later = ranges.filter((r) => r.start > minutes).sort((a, b) => a.start - b.start)[0]
  if (later) return { state: 'closed', opensAt: fmt(later.start) }
  const tomorrow = (week.get((day + 1) % 7) ?? []).slice().sort((a, b) => a.start - b.start)[0]
  if (tomorrow) return { state: 'closed', opensAt: fmt(tomorrow.start), opensTomorrow: true }
  return { state: 'closed' }
}

/** Short label for a card: "Open until 22:00", "Opens 11:00", "Opens tomorrow 09:00", "Closed today", or null when unknown. */
export function openLabel(status: OpenStatus): string | null {
  if (status.state === 'open') return status.closesAt ? `Open until ${status.closesAt}` : 'Open now'
  if (status.state === 'closed') {
    if (status.opensAt && !status.opensTomorrow) return `Opens ${status.opensAt}`
    if (status.opensAt) return `Opens tomorrow ${status.opensAt}`
    return 'Closed today'
  }
  return null
}

export const DAY_CODES = DAYS
