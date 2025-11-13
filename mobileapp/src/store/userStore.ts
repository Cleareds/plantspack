import { create } from 'zustand';
import { supabase } from '@/src/lib/supabase';
import type { UserProfile } from '@/src/types/database';

interface UserState {
  // Cached user profiles
  profiles: Map<string, UserProfile>;
  loading: Map<string, boolean>;

  // Actions
  fetchUserProfile: (userId: string) => Promise<UserProfile | null>;
  fetchUserByUsername: (username: string) => Promise<UserProfile | null>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  checkFollowing: (userId: string) => Promise<boolean>;
  getFollowersCount: (userId: string) => Promise<number>;
  getFollowingCount: (userId: string) => Promise<number>;
  clearCache: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  profiles: new Map(),
  loading: new Map(),

  fetchUserProfile: async (userId: string) => {
    try {
      // Check cache first
      const cached = get().profiles.get(userId);
      if (cached) return cached;

      // Check if already loading
      if (get().loading.get(userId)) {
        // Wait for existing request
        return new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            const profile = get().profiles.get(userId);
            const isLoading = get().loading.get(userId);
            if (profile || !isLoading) {
              clearInterval(checkInterval);
              resolve(profile || null);
            }
          }, 100);
        });
      }

      // Set loading
      const loadingMap = new Map(get().loading);
      loadingMap.set(userId, true);
      set({ loading: loadingMap });

      // Fetch from database
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Fetch counts
      const [followersResult, followingResult, postsResult] = await Promise.all([
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', userId),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', userId),
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .is('deleted_at', null),
      ]);

      const profile: UserProfile = {
        ...data,
        followers_count: followersResult.count || 0,
        following_count: followingResult.count || 0,
        posts_count: postsResult.count || 0,
      };

      // Check if current user follows this user
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id !== userId) {
        profile.is_following = await get().checkFollowing(userId);
      }

      // Cache profile
      const profilesMap = new Map(get().profiles);
      profilesMap.set(userId, profile);

      // Clear loading
      const newLoadingMap = new Map(get().loading);
      newLoadingMap.delete(userId);

      set({ profiles: profilesMap, loading: newLoadingMap });

      return profile;
    } catch (error) {
      console.error('Error fetching user profile:', error);

      // Clear loading
      const loadingMap = new Map(get().loading);
      loadingMap.delete(userId);
      set({ loading: loadingMap });

      return null;
    }
  },

  fetchUserByUsername: async (username: string) => {
    try {
      // Check if in cache
      const cached = Array.from(get().profiles.values()).find(
        p => p.username === username
      );
      if (cached) return cached;

      // Fetch from database
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error) throw error;

      // Fetch counts
      const [followersResult, followingResult, postsResult] = await Promise.all([
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', data.id),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', data.id),
        supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', data.id)
          .is('deleted_at', null),
      ]);

      const profile: UserProfile = {
        ...data,
        followers_count: followersResult.count || 0,
        following_count: followingResult.count || 0,
        posts_count: postsResult.count || 0,
      };

      // Check if current user follows this user
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id !== data.id) {
        profile.is_following = await get().checkFollowing(data.id);
      }

      // Cache profile
      const profilesMap = new Map(get().profiles);
      profilesMap.set(data.id, profile);
      set({ profiles: profilesMap });

      return profile;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  },

  followUser: async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Optimistic update
      const profilesMap = new Map(get().profiles);
      const profile = profilesMap.get(userId);
      if (profile) {
        profilesMap.set(userId, {
          ...profile,
          is_following: true,
          followers_count: (profile.followers_count || 0) + 1,
        });
        set({ profiles: profilesMap });
      }

      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: userId });

      if (error) {
        // Revert optimistic update
        if (profile) {
          profilesMap.set(userId, {
            ...profile,
            is_following: false,
            followers_count: (profile.followers_count || 0) - 1,
          });
          set({ profiles: profilesMap });
        }
        throw error;
      }
    } catch (error: any) {
      console.error('Error following user:', error);
      throw error;
    }
  },

  unfollowUser: async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Optimistic update
      const profilesMap = new Map(get().profiles);
      const profile = profilesMap.get(userId);
      if (profile) {
        profilesMap.set(userId, {
          ...profile,
          is_following: false,
          followers_count: Math.max((profile.followers_count || 0) - 1, 0),
        });
        set({ profiles: profilesMap });
      }

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      if (error) {
        // Revert optimistic update
        if (profile) {
          profilesMap.set(userId, {
            ...profile,
            is_following: true,
            followers_count: (profile.followers_count || 0) + 1,
          });
          set({ profiles: profilesMap });
        }
        throw error;
      }
    } catch (error: any) {
      console.error('Error unfollowing user:', error);
      throw error;
    }
  },

  checkFollowing: async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .maybeSingle();

      if (error) throw error;

      return !!data;
    } catch (error) {
      console.error('Error checking following:', error);
      return false;
    }
  },

  getFollowersCount: async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error getting followers count:', error);
      return 0;
    }
  },

  getFollowingCount: async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', userId);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Error getting following count:', error);
      return 0;
    }
  },

  clearCache: () => {
    set({ profiles: new Map(), loading: new Map() });
  },
}));
