import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/store/authStore';
import type { UserProfile } from '@/src/types/database';

export function useProfile(username: string) {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (userError) throw userError;

      // Fetch followers count
      const { count: followersCount, error: followersError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userData.id);

      if (followersError) throw followersError;

      // Fetch following count
      const { count: followingCount, error: followingError } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userData.id);

      if (followingError) throw followingError;

      // Fetch posts count
      const { count: postsCount, error: postsError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id)
        .is('deleted_at', null);

      if (postsError) throw postsError;

      // Check if current user is following this profile
      if (user && user.id !== userData.id) {
        const { data: followData, error: followError } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', userData.id)
          .maybeSingle();

        if (!followError) {
          setIsFollowing(!!followData);
        }
      }

      setProfile(userData);
      setFollowersCount(followersCount || 0);
      setFollowingCount(followingCount || 0);
      setPostsCount(postsCount || 0);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [username, user]);

  const toggleFollow = useCallback(async () => {
    if (!user || !profile) return;

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id);

        setIsFollowing(false);
        setFollowersCount((prev) => prev - 1);
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: profile.id,
          });

        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  }, [user, profile, isFollowing]);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  return {
    profile,
    loading,
    isFollowing,
    followersCount,
    followingCount,
    postsCount,
    toggleFollow,
    refresh: fetchProfile,
  };
}
