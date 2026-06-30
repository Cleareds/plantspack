import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useFilterStore } from '../store/filterStore';

export interface PlaceMarker {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  vegan_level: string | null;
  category: string | null;
  main_image_url: string | null;
  city: string | null;
  country: string | null;
  average_rating: number | null;
}

interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export function useNearbyPlaces(bounds: Bounds | null) {
  const veganOnly = useFilterStore((s) => s.veganOnly);
  const category = useFilterStore((s) => s.category);
  const subcategory = useFilterStore((s) => s.subcategory);
  const petFriendly = useFilterStore((s) => s.petFriendly);

  const [places, setPlaces] = useState<PlaceMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaces = useCallback(async () => {
    if (!bounds) return;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('places')
        .select('id, slug, name, latitude, longitude, vegan_level, category, main_image_url, city, country, average_rating')
        .gte('latitude', bounds.minLat)
        .lte('latitude', bounds.maxLat)
        .gte('longitude', bounds.minLng)
        .lte('longitude', bounds.maxLng)
        .is('archived_at', null)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(300);

      if (veganOnly) query = query.eq('vegan_level', 'fully_vegan');
      if (category) query = query.eq('category', category);
      if (subcategory) query = query.eq('subcategory', subcategory);
      if (petFriendly) query = query.eq('is_pet_friendly', true);

      const { data, error: err } = await query;
      if (err) throw err;
      setPlaces(data ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [bounds?.minLat, bounds?.maxLat, bounds?.minLng, bounds?.maxLng, veganOnly, category, subcategory, petFriendly]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  return { places, loading, error, refetch: fetchPlaces };
}
