import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/store/authStore';
import type { Pack } from '@/src/types/database';

export const usePack = (packId: string) => {
  const { user } = useAuthStore();
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (packId) {
      fetchPack();
    }
  }, [packId]);

  const fetchPack = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('packs')
        .select(`
          *,
          creator:users!packs_created_by_fkey(id, username, avatar_url, first_name, subscription_tier),
          members:pack_members(count),
          posts:pack_posts(count)
        `)
        .eq('id', packId)
        .single();

      if (queryError) throw queryError;

      const packWithCounts = {
        ...data,
        members_count: data.members[0]?.count || 0,
        posts_count: data.posts[0]?.count || 0,
      };

      setPack(packWithCounts);

      // Check if user is member
      if (user) {
        const { data: membership } = await supabase
          .from('pack_members')
          .select('id')
          .eq('pack_id', packId)
          .eq('user_id', user.id)
          .single();

        setIsMember(!!membership);

        // Check if following
        const { data: follow } = await supabase
          .from('pack_follows')
          .select('id')
          .eq('pack_id', packId)
          .eq('user_id', user.id)
          .single();

        setIsFollowing(!!follow);
      }
    } catch (err: any) {
      console.error('Error fetching pack:', err);
      setError(err.message || 'Failed to fetch pack');
    } finally {
      setLoading(false);
    }
  };

  const joinPack = async () => {
    if (!user) throw new Error('Not authenticated');

    try {
      await supabase
        .from('pack_members')
        .insert({
          pack_id: packId,
          user_id: user.id,
          role: 'member',
        });

      setIsMember(true);
      await fetchPack(); // Refresh to update counts
    } catch (error: any) {
      console.error('Error joining pack:', error);
      throw error;
    }
  };

  const leavePack = async () => {
    if (!user) throw new Error('Not authenticated');

    try {
      await supabase
        .from('pack_members')
        .delete()
        .eq('pack_id', packId)
        .eq('user_id', user.id);

      setIsMember(false);
      await fetchPack(); // Refresh to update counts
    } catch (error: any) {
      console.error('Error leaving pack:', error);
      throw error;
    }
  };

  const toggleFollow = async () => {
    if (!user) throw new Error('Not authenticated');

    try {
      if (isFollowing) {
        await supabase
          .from('pack_follows')
          .delete()
          .eq('pack_id', packId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('pack_follows')
          .insert({
            pack_id: packId,
            user_id: user.id,
          });
      }

      setIsFollowing(!isFollowing);
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      throw error;
    }
  };

  return {
    pack,
    loading,
    error,
    isMember,
    isFollowing,
    joinPack,
    leavePack,
    toggleFollow,
    refetch: fetchPack,
  };
};
