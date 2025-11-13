import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuthStore } from '@/src/store/authStore';
import type { PostWithUser } from '@/src/types/database';
import { constants } from '@/src/constants/theme';

export function usePosts(userId?: string) {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetchPosts = useCallback(async (refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(0);
      } else {
        setLoading(true);
      }

      const from = refresh ? 0 : page * constants.POSTS_PER_PAGE;
      const to = from + constants.POSTS_PER_PAGE - 1;

      let query = supabase
        .from('posts')
        .select(`
          *,
          user:users!posts_user_id_fkey(*),
          post_likes(user_id),
          comments(count)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(from, to);

      // Filter by user if userId is provided
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        // Only show public posts for general feed
        query = query.eq('privacy', 'public');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include counts and is_liked_by_user
      const transformedPosts: PostWithUser[] = (data || []).map((post: any) => ({
        ...post,
        likes_count: post.post_likes?.length || 0,
        comments_count: post.comments?.[0]?.count || 0,
        is_liked_by_user: user
          ? post.post_likes?.some((like: any) => like.user_id === user.id)
          : false,
      }));

      if (refresh) {
        setPosts(transformedPosts);
        setPage(1);
      } else {
        setPosts((prev) => [...prev, ...transformedPosts]);
        setPage((prev) => prev + 1);
      }

      setHasMore(transformedPosts.length === constants.POSTS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, userId, user]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPosts(false);
    }
  }, [loading, hasMore, fetchPosts]);

  const refresh = useCallback(() => {
    fetchPosts(true);
  }, [fetchPosts]);

  useEffect(() => {
    fetchPosts(true);
  }, [userId]);

  return {
    posts,
    loading,
    refreshing,
    hasMore,
    refresh,
    loadMore,
  };
}
