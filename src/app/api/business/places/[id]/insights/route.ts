import { NextRequest, NextResponse } from 'next/server'
import { requirePartnerPlace } from '@/lib/business/require-owner'

const DAY = 864e5
const iso = (d: Date) => d.toISOString().slice(0, 10)

/**
 * GET: detailed stats for a Partner place.
 * - views per week, last 12 weeks (content_view_daily, counting since 2026-07-30)
 * - taps on directions / website / phone / menu, last 30 days vs the 30 before
 * - new saves per week, last 12 weeks
 * - reviews: total, average, new in the last 30 days
 * - city comparison: this place's 30-day views vs the city median
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const gate = await requirePartnerPlace(id)
  if (!gate.ok) return gate.response
  const { admin, place } = gate

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  // Weeks end today; week 0 is the oldest.
  const start = new Date(today.getTime() - 83 * DAY)
  const d30 = new Date(today.getTime() - 29 * DAY)
  const d60 = new Date(today.getTime() - 59 * DAY)

  const [views, actions, saves, reviews, median] = await Promise.all([
    admin.from('content_view_daily').select('day, views').eq('entity_type', 'place').eq('entity_id', place.id).gte('day', iso(start)),
    admin.from('place_action_daily').select('day, action, count').eq('place_id', place.id).gte('day', iso(d60)),
    admin.from('favorite_places').select('created_at').eq('place_id', place.id).gte('created_at', start.toISOString()).limit(5000),
    admin.from('place_reviews').select('rating, created_at').eq('place_id', place.id).is('deleted_at', null).limit(2000),
    place.city && place.country
      ? admin.rpc('city_place_view_median', { p_city: place.city, p_country: place.country, p_days: 30 })
      : Promise.resolve({ data: null }),
  ])

  const weekIndex = (day: string) => Math.floor((Date.parse(day) - start.getTime()) / (7 * DAY))
  const weeks = Array.from({ length: 12 }, (_, i) => ({ start: iso(new Date(start.getTime() + i * 7 * DAY)), views: 0, saves: 0 }))
  let views30 = 0
  for (const r of views.data || []) {
    const w = weekIndex(r.day)
    if (w >= 0 && w < 12) weeks[w].views += r.views
    if (r.day >= iso(d30)) views30 += r.views
  }
  for (const r of saves.data || []) {
    const w = weekIndex(r.created_at.slice(0, 10))
    if (w >= 0 && w < 12) weeks[w].saves += 1
  }

  const taps: Record<string, { last30: number; prev30: number }> = {
    directions: { last30: 0, prev30: 0 }, website: { last30: 0, prev30: 0 }, phone: { last30: 0, prev30: 0 }, menu: { last30: 0, prev30: 0 },
  }
  for (const r of actions.data || []) {
    const bucket = r.day >= iso(d30) ? 'last30' : 'prev30'
    if (taps[r.action]) taps[r.action][bucket] += r.count
  }

  const rv = reviews.data || []
  const avg = rv.length ? rv.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / rv.length : null

  return NextResponse.json({
    place: { id: place.id, name: place.name, city: place.city },
    weeks,
    views30,
    cityMedian30: typeof median.data === 'number' ? median.data : median.data != null ? Number(median.data) : null,
    taps,
    tapsSince: '2026-10-23',
    reviews: { total: rv.length, average: avg, last30: rv.filter((r: { created_at: string }) => r.created_at >= d30.toISOString()).length },
  })
}
