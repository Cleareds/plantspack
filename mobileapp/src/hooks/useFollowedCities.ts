import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface FollowedCity {
  id: string;
  city: string;
  country: string;
}

// Cities a logged-in user has pinned. Same table the web uses (RLS-scoped to
// the user); shows on the dashboard for quick access.
export function useFollowedCities() {
  const { user } = useAuthStore();
  const [cities, setCities] = useState<FollowedCity[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!user) { setCities([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('user_followed_cities')
      .select('id, city, country')
      .eq('user_id', user.id)
      .order('last_visited_at', { ascending: false });
    setCities((data ?? []) as FollowedCity[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  return { cities, loading, refetch };
}

export function useCityFollow(city: string | undefined, country: string | undefined) {
  const { user } = useAuthStore();
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!user || !city || !country) { setFollowing(false); return; }
    supabase
      .from('user_followed_cities')
      .select('id')
      .eq('user_id', user.id)
      .eq('city', city)
      .eq('country', country)
      .maybeSingle()
      .then(({ data }) => setFollowing(!!data));
  }, [user, city, country]);

  const toggle = useCallback(async () => {
    if (!user || !city || !country) return false;
    if (following) {
      await supabase.from('user_followed_cities').delete()
        .eq('user_id', user.id).eq('city', city).eq('country', country);
      setFollowing(false);
    } else {
      await supabase.from('user_followed_cities')
        .insert({ user_id: user.id, city, country });
      setFollowing(true);
    }
    return true;
  }, [user, city, country, following]);

  return { following, toggle, canFollow: !!user };
}
