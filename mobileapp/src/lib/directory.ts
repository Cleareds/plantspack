import { supabase } from './supabase';

// Browse hierarchy data — mirrors the web /vegan-places page. Reads the same
// materialized views the website uses (directory_countries / directory_cities),
// which are readable with the anon key. Internally we pass real country/city
// names as route params rather than SEO slugs, so no slug round-trip is needed.

export interface CountryRow {
  country: string;
  place_count: number;
  city_count: number;
  fully_vegan_count: number;
}

export interface CityRow {
  city: string;
  country: string;
  place_count: number;
  fully_vegan_count: number;
}

export interface DirectoryPlace {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  vegan_level: string | null;
  category: string | null;
  main_image_url: string | null;
  average_rating: number | null;
  review_count: number | null;
}

// A city needs at least this many places to surface (matches the web grid).
const MIN_CITY_PLACES = 5;

export const VEGAN_LEVEL_ORDER: Record<string, number> = {
  fully_vegan: 3,
  mostly_vegan: 2,
  vegan_friendly: 1,
  vegan_options: 0,
};

export type PlaceFilters = {
  veganOnly?: boolean;
  category?: string | null;
  subcategory?: string | null;
  petFriendly?: boolean;
};

// Sort places client-side (matches the website's "vegan first" default).
export function sortPlaces(places: DirectoryPlace[], mode: 'vegan' | 'rating' | 'name'): DirectoryPlace[] {
  const out = [...places];
  if (mode === 'name') return out.sort((a, b) => a.name.localeCompare(b.name));
  if (mode === 'rating') return out.sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
  return out.sort((a, b) => {
    const lvl = (VEGAN_LEVEL_ORDER[b.vegan_level ?? ''] ?? 0) - (VEGAN_LEVEL_ORDER[a.vegan_level ?? ''] ?? 0);
    if (lvl) return lvl;
    const r = (b.average_rating ?? 0) - (a.average_rating ?? 0);
    if (r) return r;
    return a.name.localeCompare(b.name);
  });
}

export async function fetchCountries(): Promise<CountryRow[]> {
  const { data, error } = await supabase
    .from('directory_countries')
    .select('country, place_count, city_count, fully_vegan_count')
    .order('place_count', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CountryRow[];
}

export async function fetchCities(country: string, veganOnly = false): Promise<CityRow[]> {
  let query = supabase
    .from('directory_cities')
    .select('city, country, place_count, fully_vegan_count')
    .eq('country', country);
  // In 100%-vegan mode, surface cities that actually have fully-vegan spots,
  // ranked by that count; otherwise rank by total places (>= threshold).
  query = veganOnly
    ? query.gte('fully_vegan_count', 1).order('fully_vegan_count', { ascending: false })
    : query.gte('place_count', MIN_CITY_PLACES).order('place_count', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CityRow[];
}

export async function fetchPlacesInCity(country: string, city: string, filters: PlaceFilters = {}): Promise<DirectoryPlace[]> {
  let query = supabase
    .from('places')
    .select('id, slug, name, city, country, vegan_level, category, main_image_url, average_rating, review_count')
    .is('archived_at', null)
    .ilike('country', country)
    .ilike('city', city);

  if (filters.veganOnly) query = query.eq('vegan_level', 'fully_vegan');
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.subcategory) query = query.eq('subcategory', filters.subcategory);
  if (filters.petFriendly) query = query.eq('is_pet_friendly', true);

  const { data, error } = await query.limit(1000);
  if (error) throw error;
  return (data ?? []) as DirectoryPlace[];
}
