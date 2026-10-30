/**
 * Place categories and types (places.category / places.subcategory) - the one list.
 *
 * Every picker, validator and label map imports from here, so the add form, the
 * edit form, the data-quality page and the admin API cannot drift apart again
 * (they did until 2026-10-30: data-quality saved `fast_food` while 4,029 rows
 * held `fast-food`). Values are the spellings the places table already holds.
 *
 * Cuisine (pizza, ramen, sushi, ...) is NOT a type: it lives in
 * places.cuisine_types (text[]). Types say what kind of venue it is.
 */

export type PlaceCategory = 'eat' | 'hotel' | 'store' | 'organisation' | 'event' | 'other'

export interface PlaceSubcategory {
  value: string
  label: string
  /** organisation only: animal sanctuaries/rescues vs other organisations */
  group?: OrganisationGroup
}

export type OrganisationGroup = 'animal_care' | 'organisation'

export const ORGANISATION_GROUP_LABELS: Record<OrganisationGroup, string> = {
  animal_care: 'Sanctuaries & rescues',
  organisation: 'Organisations',
}

export const PLACE_CATEGORIES: Array<{ value: PlaceCategory; label: string }> = [
  { value: 'eat', label: 'Eat' },
  { value: 'hotel', label: 'Stay' },
  { value: 'store', label: 'Store' },
  { value: 'organisation', label: 'Organisation' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
]

export const PLACE_SUBCATEGORIES: Record<PlaceCategory, PlaceSubcategory[]> = {
  eat: [
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'cafe', label: 'Cafe' },
    { value: 'fast-food', label: 'Fast food / Takeaway' },
    { value: 'bar', label: 'Bar / Pub' },
    { value: 'bakery', label: 'Bakery' },
    { value: 'ice_cream', label: 'Ice cream / Dessert' },
    { value: 'deli', label: 'Deli' },
    { value: 'food-truck', label: 'Food truck' },
    { value: 'online-delivery', label: 'Online / Delivery' },
    { value: 'caterer', label: 'Caterer' },
  ],
  hotel: [
    { value: 'hotel', label: 'Hotel' },
    { value: 'bnb', label: 'B&B' },
    { value: 'guesthouse', label: 'Guesthouse' },
    { value: 'hostel', label: 'Hostel' },
    { value: 'retreat', label: 'Retreat' },
    { value: 'resort', label: 'Resort' },
    { value: 'apartment', label: 'Apartment / Self-catering' },
    { value: 'eco-lodge', label: 'Eco-lodge / Glamping' },
    { value: 'agriturismo', label: 'Agriturismo / Farm stay' },
    { value: 'other_stay', label: 'Other stay' },
  ],
  store: [
    { value: 'grocery', label: 'Grocery / Supermarket' },
    { value: 'health-food', label: 'Health food' },
    { value: 'bakery', label: 'Bakery' },
    { value: 'specialty', label: 'Specialty food' },
    { value: 'butcher', label: 'Vegan butcher' },
    { value: 'clothing', label: 'Clothing / Shoes' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'bookshop', label: 'Bookshop' },
    { value: 'farm-shop', label: 'Farm shop' },
    { value: 'market', label: 'Market' },
    { value: 'flagship', label: 'Brand store' },
    { value: 'brand-hq', label: 'Vegan brand HQ' },
    { value: 'other_shop', label: 'Other shop' },
  ],
  organisation: [
    { value: 'sanctuary', label: 'Animal sanctuary', group: 'animal_care' },
    { value: 'wildlife-rescue', label: 'Wildlife rescue', group: 'animal_care' },
    { value: 'companion-rescue', label: 'Companion animal rescue', group: 'animal_care' },
    { value: 'advocacy', label: 'Advocacy group', group: 'organisation' },
    { value: 'charity', label: 'Charity', group: 'organisation' },
    { value: 'community', label: 'Community group', group: 'organisation' },
    { value: 'school', label: 'School / Education', group: 'organisation' },
    { value: 'brand-hq', label: 'Vegan brand HQ', group: 'organisation' },
  ],
  event: [
    { value: 'festival', label: 'Festival' },
    { value: 'market', label: 'Market' },
    { value: 'conference', label: 'Conference / Expo' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'social', label: 'Social / Meetup' },
    { value: 'protest', label: 'Protest' },
  ],
  other: [
    { value: 'yoga', label: 'Yoga' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'wellness', label: 'Wellness' },
    { value: 'salon-spa', label: 'Salon / Spa' },
    { value: 'tattoo', label: 'Tattoo' },
    { value: 'tour', label: 'Tour' },
    { value: 'creative', label: 'Creative' },
    { value: 'professional', label: 'Professional services' },
  ],
}

export function isPlaceCategory(value: unknown): value is PlaceCategory {
  return PLACE_CATEGORIES.some(c => c.value === value)
}

export function isValidSubcategory(category: string, subcategory: string): boolean {
  return isPlaceCategory(category) && PLACE_SUBCATEGORIES[category].some(s => s.value === subcategory)
}

export function categoryLabel(category: string | null | undefined): string {
  return PLACE_CATEGORIES.find(c => c.value === category)?.label ?? (category || '')
}

/** Label for a type; with no category given, the first category that has the value wins. */
export function subcategoryLabel(subcategory: string | null | undefined, category?: string | null): string | null {
  if (!subcategory) return null
  const lists = category && isPlaceCategory(category) ? [PLACE_SUBCATEGORIES[category]] : Object.values(PLACE_SUBCATEGORIES)
  for (const list of lists) {
    const hit = list.find(s => s.value === subcategory)
    if (hit) return hit.label
  }
  return null
}

export function organisationGroup(subcategory: string | null | undefined): OrganisationGroup | null {
  return PLACE_SUBCATEGORIES.organisation.find(s => s.value === subcategory)?.group ?? null
}

/** "Pizza, ramen" -> ['pizza', 'ramen'] (the cuisine_types spelling: lowercase, underscores). */
export function parseCuisines(text: string): string[] {
  return [...new Set(text.split(',').map(c => c.trim().toLowerCase().replace(/[\s-]+/g, '_')).filter(Boolean))]
}
