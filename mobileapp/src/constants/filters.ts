// Place filter options — mirror the website's filter set.

export const CATEGORIES: { value: string; label: string; icon: string }[] = [
  { value: 'eat', label: 'Eat', icon: 'restaurant-outline' },
  { value: 'store', label: 'Store', icon: 'storefront-outline' },
  { value: 'hotel', label: 'Stay', icon: 'bed-outline' },
  { value: 'organisation', label: 'Sanctuary', icon: 'paw-outline' },
];

export const SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  eat: [
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'cafe', label: 'Cafe' },
    { value: 'fast_food', label: 'Fast Food' },
    { value: 'bar', label: 'Bar/Pub' },
    { value: 'bakery', label: 'Bakery' },
    { value: 'ice_cream', label: 'Ice Cream' },
  ],
  store: [
    { value: 'grocery', label: 'Grocery' },
    { value: 'health_food', label: 'Health Food' },
    { value: 'bakery', label: 'Bakery' },
    { value: 'specialty', label: 'Specialty' },
  ],
  hotel: [
    { value: 'hotel', label: 'Hotel' },
    { value: 'hostel', label: 'Hostel' },
    { value: 'bnb', label: 'B&B' },
    { value: 'retreat', label: 'Retreat' },
  ],
};

// Used when the global "100% Vegan only" toggle is OFF.
export const VEGAN_LEVELS: { value: string; label: string }[] = [
  { value: 'fully_vegan', label: '100% Vegan' },
  { value: 'mostly_vegan', label: 'Mostly Vegan' },
  { value: 'vegan_friendly', label: 'Vegan-Friendly' },
  { value: 'vegan_options', label: 'Has Options' },
];

export const SORTS: { value: 'vegan' | 'rating' | 'name'; label: string }[] = [
  { value: 'vegan', label: 'Vegan first' },
  { value: 'rating', label: 'Rating' },
  { value: 'name', label: 'A-Z' },
];
