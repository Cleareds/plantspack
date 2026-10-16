// The city/country hubs used to ship EVERY place in full to the client list
// (Berlin: 1,771 places = 1.5 MB of RSC payload, 2.7 MB HTML, mobile LCP
// 4.5 s). The list only needs a few fields per place to filter, count,
// sort, paginate and draw the map. Full card data (image, description,
// address, phone, website, verification) is needed for the 30 cards on
// screen only: the server sends it for the default first page (so the SSR
// HTML carries complete cards for crawlers) and the client fetches the
// rest per page from /api/places/cards.
//
// Plain module (no 'use client') so both the server hub and the client list
// can import it.
import { veganLevelOrder } from '@/lib/vegan-level'

export const CITY_LIST_PAGE_SIZE = 30

export interface LightPlace {
  id: string
  slug: string | null
  name: string
  category: string
  subcategory: string | null
  vegan_level: string | null
  is_pet_friendly: boolean
  latitude: number
  longitude: number
  average_rating: number
  review_count: number
  /** Only the `also:<category>` tags - the list uses nothing else from tags. */
  tags?: string[] | null
}

export function toLightPlace(p: any): LightPlace {
  const also = Array.isArray(p.tags) ? p.tags.filter((t: unknown) => typeof t === 'string' && t.startsWith('also:')) : []
  return {
    id: p.id,
    slug: p.slug ?? null,
    name: p.name,
    category: p.category,
    subcategory: p.subcategory ?? null,
    vegan_level: p.vegan_level ?? null,
    is_pet_friendly: !!p.is_pet_friendly,
    latitude: p.latitude,
    longitude: p.longitude,
    average_rating: p.average_rating ?? 0,
    review_count: p.review_count ?? 0,
    ...(also.length ? { tags: also } : {}),
  }
}

/** The list's default order (sort=vegan): fully vegan first, then rating, then name. */
export function defaultCityListOrder<T extends { vegan_level: string | null; average_rating: number; name: string }>(places: T[]): T[] {
  return [...places].sort((a, b) => {
    const levelDiff = veganLevelOrder(b.vegan_level) - veganLevelOrder(a.vegan_level)
    if (levelDiff !== 0) return levelDiff
    const ratingDiff = (b.average_rating || 0) - (a.average_rating || 0)
    if (ratingDiff !== 0) return ratingDiff
    return a.name.localeCompare(b.name)
  })
}

/**
 * Counts the list needs to draw its filter pills before it has any rows.
 * The hubs ship this (a few hundred bytes) instead of every light row
 * (Berlin: 1,801 rows, 1.15 MB of RSC payload). Rows load from
 * /api/places/light the first time the visitor filters, sorts, pages or
 * scrolls to the map.
 */
export interface FacetCounts {
  total: number
  /** Per category, counting `also:<category>` tags like the list does. */
  categories: Record<string, number>
  /** Per primary category, per subcategory. */
  subcategories: Record<string, Record<string, number>>
}
export interface ListSummary extends FacetCounts {
  /** The same counts restricted to one vegan level. */
  byLevel: Record<string, FacetCounts>
}

export function categoriesOfLight(p: { category: string; tags?: string[] | null }): string[] {
  const extra = (p.tags || []).filter((t): t is string => typeof t === 'string' && t.startsWith('also:')).map(t => t.slice(5))
  return [...new Set([p.category, ...extra])]
}

function countFacets(rows: LightPlace[]): FacetCounts {
  const out: FacetCounts = { total: rows.length, categories: {}, subcategories: {} }
  for (const p of rows) {
    for (const c of categoriesOfLight(p)) out.categories[c] = (out.categories[c] || 0) + 1
    if (p.subcategory) {
      const sub = (out.subcategories[p.category] ||= {})
      sub[p.subcategory] = (sub[p.subcategory] || 0) + 1
    }
  }
  return out
}

export function summarizeLightPlaces(rows: LightPlace[]): ListSummary {
  const byLevel: Record<string, FacetCounts> = {}
  const levels = [...new Set(rows.map(p => p.vegan_level).filter((l): l is string => !!l))]
  for (const l of levels) byLevel[l] = countFacets(rows.filter(p => p.vegan_level === l))
  return { ...countFacets(rows), byLevel }
}
