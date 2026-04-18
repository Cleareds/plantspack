/**
 * Deterministic category assignment for incoming place records.
 *
 * Output values must match the places_category_check enum:
 *   'eat' | 'store' | 'hotel' | 'event' | 'organisation' | 'other'
 *
 * The `note` return is stored in places.categorization_note so admins can
 * review low-confidence picks in the admin UI.
 */

export type PlaceCategory = 'eat' | 'store' | 'hotel' | 'event' | 'organisation' | 'other'

export interface CategorizeHints {
  /** Primary place name */
  name?: string | null
  /** OSM `amenity` / `shop` / `tourism` tags, if known */
  osmTags?: Record<string, string | undefined>
  /** Foursquare category names (human strings) */
  fsqCategoryNames?: string[]
  /** VegGuide-style category labels */
  vegguideCategories?: string[]
  /** Cuisine strings (OSM cuisine=) */
  cuisineTags?: string[]
}

export interface CategorizeResult {
  category: PlaceCategory
  /** 0–1 confidence: 1 = unambiguous signal, 0.3 = default fallback */
  confidence: number
  /** Short human-readable rule id + match, stored as categorization_note */
  note: string
}

const STORE_NAME_RE = /\b(store|shop|grocery|market|bakery|deli|patisserie|butcher|cheesemonger|fromager|supermarket|supermarché|supermercado|coop|co-?op|boutique|épicerie|epicerie)\b/i
const HOTEL_NAME_RE = /\b(hotel|hostel|inn|lodge|b&b|bnb|bed\s*&?\s*breakfast|guest\s*house|guesthouse|resort|villa\s+hotel|riad|ryokan|pension|pousada|hospedaje)\b/i
const EVENT_NAME_RE = /\b(festival|fair|market\s+day|vegfest|veganfest|conference|expo|meetup)\b/i
const ORG_NAME_RE = /\b(society|foundation|sanctuary|rescue|charity|association|ngo|shelter|alliance|coalition|union)\b/i

export function detectCategory(h: CategorizeHints): CategorizeResult {
  const name = h.name ?? ''

  // ---- 1. OSM structural tags (highest confidence if present) ----
  if (h.osmTags) {
    const t = h.osmTags
    if (t.tourism && /hotel|hostel|motel|guest_house|apartment|chalet|resort/i.test(t.tourism)) {
      return { category: 'hotel', confidence: 0.95, note: `osm:tourism=${t.tourism}` }
    }
    if (t.shop) {
      // shop=* means it's a retail place regardless of name
      return { category: 'store', confidence: 0.92, note: `osm:shop=${t.shop}` }
    }
    if (t.amenity) {
      if (/restaurant|cafe|fast_food|food_court|bar|pub|ice_cream|bistro|juice_bar/i.test(t.amenity)) {
        return { category: 'eat', confidence: 0.95, note: `osm:amenity=${t.amenity}` }
      }
      if (/community_centre|social_facility|place_of_worship|animal_shelter/i.test(t.amenity)) {
        return { category: 'organisation', confidence: 0.75, note: `osm:amenity=${t.amenity}` }
      }
    }
  }

  // ---- 2. Foursquare categories (good signal, but mixed "Vegan and Vegetarian") ----
  if (h.fsqCategoryNames && h.fsqCategoryNames.length) {
    const blob = h.fsqCategoryNames.join(' ').toLowerCase()
    if (/hotel|hostel|inn|lodge|bed\s*&?\s*breakfast|resort/.test(blob)) {
      return { category: 'hotel', confidence: 0.9, note: `fsq:${blob.slice(0, 60)}` }
    }
    if (/grocery|market|bakery|deli|shop|store|supermarket|patisserie|butcher|wine|spirits/.test(blob)) {
      return { category: 'store', confidence: 0.85, note: `fsq:${blob.slice(0, 60)}` }
    }
    if (/restaurant|cafe|bar|pub|eatery|food\s+truck|diner|bistro|pizzeria|juice\s+bar|ice\s+cream/.test(blob)) {
      return { category: 'eat', confidence: 0.9, note: `fsq:${blob.slice(0, 60)}` }
    }
  }

  // ---- 3. Name-based heuristics ----
  if (HOTEL_NAME_RE.test(name)) {
    return { category: 'hotel', confidence: 0.7, note: `name~hotel` }
  }
  if (ORG_NAME_RE.test(name)) {
    return { category: 'organisation', confidence: 0.7, note: `name~organisation` }
  }
  if (EVENT_NAME_RE.test(name)) {
    return { category: 'event', confidence: 0.7, note: `name~event` }
  }
  if (STORE_NAME_RE.test(name)) {
    return { category: 'store', confidence: 0.6, note: `name~store` }
  }

  // ---- 4. Cuisine hint → eat ----
  if (h.cuisineTags && h.cuisineTags.length) {
    return { category: 'eat', confidence: 0.6, note: `cuisine:${h.cuisineTags.slice(0, 2).join(',')}` }
  }

  // ---- 5. VegGuide categories (often just "Restaurant") ----
  if (h.vegguideCategories && h.vegguideCategories.length) {
    const blob = h.vegguideCategories.join(' ').toLowerCase()
    if (/grocery|market|bakery|store|shop|deli/.test(blob)) {
      return { category: 'store', confidence: 0.6, note: `vegguide:${blob.slice(0, 40)}` }
    }
    if (/restaurant|cafe|bar|eatery/.test(blob)) {
      return { category: 'eat', confidence: 0.6, note: `vegguide:${blob.slice(0, 40)}` }
    }
  }

  // ---- 6. Fallback: assume eat (most common) but mark low-confidence ----
  return { category: 'eat', confidence: 0.3, note: 'default:eat' }
}
