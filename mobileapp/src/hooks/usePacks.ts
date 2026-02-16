import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { Pack, PackCategory } from '@/src/types/database';

interface UsePacksOptions {
  category?: PackCategory;
  searchTerm?: string;
}

export const usePacks = (options: UsePacksOptions = {}) => {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPacks();
  }, [options.category, options.searchTerm]);

  const fetchPacks = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('packs')
        .select(`
          *,
          creator:users!packs_creator_id_fkey(id, username, avatar_url, subscription_tier),
          members:pack_members(count),
          posts:pack_posts(count)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      // Filter by category
      if (options.category && options.category !== 'all') {
        query = query.eq('category', options.category);
      }

      // Search by title or description
      if (options.searchTerm) {
        query = query.or(`title.ilike.%${options.searchTerm}%,description.ilike.%${options.searchTerm}%`);
      }

      const { data, error: queryError } = await query.limit(50);

      if (queryError) throw queryError;

      // Transform data to include counts
      const packsWithCounts = (data || []).map((pack: any) => ({
        ...pack,
        members_count: pack.members[0]?.count || 0,
        posts_count: pack.posts[0]?.count || 0,
      }));

      setPacks(packsWithCounts);
    } catch (err: any) {
      console.error('Error fetching packs:', err);
      setError(err.message || 'Failed to fetch packs');
    } finally {
      setLoading(false);
    }
  };

  return {
    packs,
    loading,
    error,
    refetch: fetchPacks,
  };
};
