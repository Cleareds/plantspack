// Upcoming vegan events near a point, for the homepage sidebar.
//
// One cached list of upcoming, geocoded, public events (refreshed hourly),
// then a pure distance filter per request. No extra request from the
// browser, so the block is server-rendered and causes no layout shift.
//
// Radius ladder: events within 300 km in the next 60 days; if none, widen to
// 800 km; if still none, return nothing so the section stays hidden rather
// than showing far-away events as if they were local.
import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase-admin'

export interface NearbyEvent {
  slug: string
  title: string
  city: string | null
  country: string | null
  /** YYYY-MM-DD in the event's own timezone (taken from the ISO string, not re-zoned). */
  startDate: string
  endDate: string | null
  isFree: boolean
  distanceKm: number
}

export interface NearbyEvents {
  radiusKm: number
  items: NearbyEvent[]
}

interface CachedEvent {
  slug: string
  title: string
  city: string | null
  country: string | null
  start: string
  end: string | null
  isFree: boolean
  lat: number
  lng: number
}

const WINDOW_DAYS = 60
const RADII_KM = [300, 800]
const MAX_ITEMS = 4

// Admin client skips RLS, so filter privacy / deletion / moderation here
// (see feedback_db_pitfalls: drafts must never leak through admin reads).
export const getUpcomingGeocodedEvents = unstable_cache(async (): Promise<CachedEvent[]> => {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('posts')
    .select('slug, title, event_data')
    .eq('category', 'event')
    .eq('privacy', 'public')
    .eq('moderation_status', 'published')
    .is('deleted_at', null)
    .gte('event_data->>start_time', new Date(Date.now() - 86400000).toISOString().slice(0, 10))
    .limit(1000)
  const out: CachedEvent[] = []
  for (const p of data || []) {
    const ed = (p as any).event_data || {}
    if (ed.cancelled) continue
    const lat = Number(ed.latitude), lng = Number(ed.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (!ed.start_time || !p.slug) continue
    out.push({
      slug: p.slug,
      title: ed.title || (p as any).title || 'Vegan event',
      city: ed.city || null,
      country: ed.country || null,
      start: ed.start_time,
      end: ed.end_time || null,
      isFree: !!ed.is_free,
      lat, lng,
    })
  }
  return out
}, ['home-upcoming-geocoded-events-v1'], { revalidate: 3600, tags: ['home', 'events'] })

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function pickNearbyEvents(events: CachedEvent[], lat: number, lng: number, now = Date.now()): NearbyEvents | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const horizon = now + WINDOW_DAYS * 86400000
  const inWindow = events
    .filter(e => {
      const endMs = new Date(e.end || e.start).getTime()
      const startMs = new Date(e.start).getTime()
      return endMs >= now && startMs <= horizon
    })
    .map(e => ({ e, d: haversineKm(lat, lng, e.lat, e.lng) }))
  for (const radiusKm of RADII_KM) {
    const hits = inWindow
      .filter(x => x.d <= radiusKm)
      // Soonest first; distance breaks ties between same-day events.
      .sort((a, b) => a.e.start.localeCompare(b.e.start) || a.d - b.d)
      .slice(0, MAX_ITEMS)
    if (hits.length) {
      return {
        radiusKm,
        items: hits.map(({ e, d }) => ({
          slug: e.slug,
          title: e.title,
          city: e.city,
          country: e.country,
          startDate: e.start.slice(0, 10),
          endDate: e.end ? e.end.slice(0, 10) : null,
          isFree: e.isFree,
          distanceKm: Math.round(d),
        })),
      }
    }
  }
  return null
}

/** Coordinates for a city we list places in, for pinned/followed cities that carry no lat/lng. */
export const getCityCentroid = unstable_cache(async (city: string, country: string): Promise<{ lat: number; lng: number } | null> => {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('places')
    .select('latitude, longitude')
    .eq('city', city)
    .eq('country', country)
    .is('archived_at', null)
    .not('latitude', 'is', null)
    .limit(50)
  const pts = (data || []).filter((p: any) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
  if (!pts.length) return null
  // Median, not mean: one mis-geocoded place should not drag the centre away.
  const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] }
  return { lat: med(pts.map((p: any) => p.latitude)), lng: med(pts.map((p: any) => p.longitude)) }
}, ['home-city-centroid-v1'], { revalidate: 86400 })
