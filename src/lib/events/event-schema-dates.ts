/**
 * schema.org Event date fields for JSON-LD.
 *
 * Google recommends `endDate` on every Event (its absence is the "Missing field
 * endDate" warning in Search Console). Many of our events are single-day and
 * carry no `end_time`, so we always emit `endDate`, falling back to the start.
 *
 * Honors `time_tbd`: when the clock time isn't confirmed we emit date-only
 * (YYYY-MM-DD) for both fields so we never advertise a fake start/end time.
 *
 * Returns null only when there is no start_time at all (then omit the dates).
 */
export function eventSchemaDates(ed: {
  start_time?: string | null
  end_time?: string | null
  time_tbd?: boolean | null
}): { startDate: string; endDate: string } | null {
  const start = ed.start_time
  if (!start) return null
  const end = ed.end_time || start
  const fmt = (v: string) => (ed.time_tbd ? String(v).slice(0, 10) : String(v))
  return { startDate: fmt(start), endDate: fmt(end) }
}

type EventUser = {
  username?: string | null
  first_name?: string | null
  last_name?: string | null
} | null

/**
 * schema.org `description` for an Event, from the post content. Google flags a
 * missing `description` as a non-critical issue, so we always emit one: the
 * first ~300 chars of the body, falling back to the event name when empty.
 */
export function eventSchemaDescription(content?: string | null, fallbackName?: string): string {
  const text = (content || '').trim().replace(/\s+/g, ' ').slice(0, 300)
  return text || fallbackName || 'Vegan event'
}

/**
 * schema.org `organizer` Organization for an Event, from the posting user.
 * Google flags a missing `organizer` as a non-critical issue. Falls back to a
 * generic Plants Pack community organizer when no user is joined.
 */
export function eventSchemaOrganizer(userOrArray: EventUser | EventUser[]): { '@type': 'Organization'; name: string; url: string } {
  const user = Array.isArray(userOrArray) ? userOrArray[0] : userOrArray
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || user?.username || 'Plants Pack community'
  const url = user?.username
    ? `https://www.plantspack.com/profile/${user.username}`
    : 'https://www.plantspack.com/events'
  return { '@type': 'Organization', name, url }
}
