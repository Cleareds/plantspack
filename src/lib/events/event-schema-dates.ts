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
