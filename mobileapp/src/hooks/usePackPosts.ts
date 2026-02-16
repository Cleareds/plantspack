import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import type { PostWithUser } from '@/src/types/database';

export const usePackPosts = (packId: string) => {
  const [posts, setPosts] = useState<PostWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (packId) {
      fetchPosts(true);
    }
  }, [packId]);

  const fetchPosts = async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const startIndex = refresh ? 0 : page * 20;

      // Get post IDs from pack_posts
      const { data: packPostsData, error: packPostsError } = await supabase
        .from('pack_posts')
        .select('post_id')
        .eq('pack_id', packId)
        .range(startIndex, startIndex + 19);

      if (packPostsError) throw packPostsError;

      if (!packPostsData || packPostsData.length === 0) {
        setPosts(refresh ? [] : posts);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const postIds = packPostsData.map(pp => pp.post_id);

      // Get full post data
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          user:users!posts_user_id_fkey(*),
          likes:post_likes(count),
          comments:comments(count)
        `)
        .in('id', postIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const postsWithCounts: PostWithUser[] = (postsData || []).map((post: any) => ({
        ...post,
        likes_count: post.likes[0]?.count || 0,
        comments_count: post.comments[0]?.count || 0,
      }));

      // Check if user liked each post
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);

        const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
        postsWithCounts.forEach(post => {
          post.is_liked_by_user = likedPostIds.has(post.id);
        });
      }

      setPosts(refresh ? postsWithCounts : [...posts, ...postsWithCounts]);
      setHasMore(postsWithCounts.length === 20);
      setPage(refresh ? 1 : page + 1);
    } catch (err: any) {
      console.error('Error fetching pack posts:', err);
      setError(err.message || 'Failed to fetch pack posts');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!loading && hasMore) {
      await fetchPosts(false);
    }
  };

  return {
    posts,
    loading,
    error,
    hasMore,
    refetch: () => fetchPosts(true),
    loadMore,
  };
};
