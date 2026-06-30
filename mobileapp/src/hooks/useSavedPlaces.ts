import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface SavedPlace {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  vegan_level: string | null;
  category: string | null;
  main_image_url: string | null;
  average_rating: number | null;
}

export function useSavedPlaces() {
  const { user } = useAuthStore();
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSaved = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('favorite_places')
      .select('place_id, places(id, slug, name, city, country, vegan_level, category, main_image_url, average_rating)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const result = (data ?? [])
      .map((row: any) => row.places)
      .filter(Boolean) as SavedPlace[];
    setPlaces(result);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  return { places, loading, refetch: fetchSaved };
}

export function usePlaceSaveToggle(placeId: string) {
  const { user } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !placeId) return;
    supabase
      .from('favorite_places')
      .select('id')
      .eq('user_id', user.id)
      .eq('place_id', placeId)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, placeId]);

  const toggle = useCallback(async () => {
    if (!user || !placeId) return false;
    setLoading(true);
    if (saved) {
      await supabase
        .from('favorite_places')
        .delete()
        .eq('user_id', user.id)
        .eq('place_id', placeId);
      setSaved(false);
    } else {
      await supabase.from('favorite_places').insert({ user_id: user.id, place_id: placeId });
      setSaved(true);
    }
    setLoading(false);
    return true;
  }, [user, placeId, saved]);

  return { saved, loading, toggle };
}
