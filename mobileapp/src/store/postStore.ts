import { create } from 'zustand';
import { supabase } from '@/src/lib/supabase';
import type { PostWithUser, PostPrivacy, PostType } from '@/src/types/database';
import { constants } from '@/src/constants/theme';

type SortOption = 'relevancy' | 'recent' | 'most_liked_today' | 'most_liked_week' | 'most_liked_month' | 'most_liked_all';
type FeedType = 'public' | 'friends';

interface PostState {
  posts: PostWithUser[];
  loading: boolean;
  hasMore: boolean;
  page: number;
  sortBy: SortOption;
  feedType: FeedType;
  searchTerm: string;
  newPostsCount: number;

  // Actions
  fetchPosts: (refresh?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  setSortBy: (sort: SortOption) => void;
  setFeedType: (type: FeedType) => void;
  setSearchTerm: (term: string) => void;
  createPost: (data: {
    content: string;
    privacy: PostPrivacy;
    images?: string[];
    videoUrls?: string[];
    parentPostId?: string;
    postType?: PostType;
    quoteContent?: string;
  }) => Promise<PostWithUser>;
  updatePost: (postId: string, updates: { content: string }) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  unlikePost: (postId: string) => Promise<void>;
  loadNewPosts: () => void;
  subscribeToNewPosts: (userId: string | null) => () => void;
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  loading: false,
  hasMore: true,
  page: 0,
  sortBy: 'relevancy',
  feedType: 'public',
  searchTerm: '',
  newPostsCount: 0,

  fetchPosts: async (refresh = false) => {
    try {
      const { loading, feedType, sortBy, searchTerm } = get();
      if (loading) return;

      set({ loading: true });

      const startIndex = refresh ? 0 : get().page * constants.POSTS_PER_PAGE;

      let query = supabase
        .from('posts')
        .select(`
          *,
          user:users!posts_user_id_fkey(*),
          likes:post_likes(count),
          comments:comments(count)
        `)
        .is('deleted_at', null);

      // Filter by search term
      if (searchTerm && searchTerm.length >= 3) {
        query = query.ilike('content', `%${searchTerm}%`);
      }

      // Filter by feed type
      if (feedType === 'public') {
        query = query.eq('privacy', 'public');
      } else {
        // Friends feed - posts from users you follow
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: following } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

          if (following && following.length > 0) {
            const followingIds = following.map(f => f.following_id);
            query = query.in('user_id', followingIds);
          } else {
            // No following, return empty
            set({ posts: [], loading: false, hasMore: false });
            return;
          }
        }
      }

      // Sort
      switch (sortBy) {
        case 'relevancy':
          query = query.order('engagement_score', { ascending: false });
          break;
        case 'recent':
          query = query.order('created_at', { ascending: false });
          break;
        case 'most_liked_today':
        case 'most_liked_week':
        case 'most_liked_month':
        case 'most_liked_all':
          // For liked posts, we'll need to do custom sorting after fetching
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      // Pagination
      query = query.range(startIndex, startIndex + constants.POSTS_PER_PAGE - 1);

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to match PostWithUser type
      const posts: PostWithUser[] = (data || []).map((post: any) => ({
        ...post,
        likes_count: post.likes[0]?.count || 0,
        comments_count: post.comments[0]?.count || 0,
      }));

      // Check if user liked each post
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const postIds = posts.map(p => p.id);
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);

        const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
        posts.forEach(post => {
          post.is_liked_by_user = likedPostIds.has(post.id);
        });
      }

      set({
        posts: refresh ? posts : [...get().posts, ...posts],
        loading: false,
        hasMore: posts.length === constants.POSTS_PER_PAGE,
        page: refresh ? 1 : get().page + 1,
        newPostsCount: 0,
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
      set({ loading: false });
    }
  },

  loadMore: async () => {
    const { hasMore, loading } = get();
    if (!hasMore || loading) return;
    await get().fetchPosts(false);
  },

  setSearchTerm: (term) => {
    set({ searchTerm: term, page: 0, posts: [] });
    get().fetchPosts(true);
  },

  setSortBy: (sort) => {
    set({ sortBy: sort, posts: [], page: 0, hasMore: true });
    get().fetchPosts(true);
  },

  setFeedType: (type) => {
    set({ feedType: type, posts: [], page: 0, hasMore: true });
    get().fetchPosts(true);
  },

  createPost: async (data) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: newPost, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: data.content,
          privacy: data.privacy,
          images: data.images || null,
          video_urls: data.videoUrls || null,
          parent_post_id: data.parentPostId || null,
          post_type: data.postType || 'original',
          quote_content: data.quoteContent || null,
        })
        .select(`
          *,
          user:users!posts_user_id_fkey(*)
        `)
        .single();

      if (error) throw error;

      // Add to posts list if it matches current feed
      const postWithUser: PostWithUser = {
        ...newPost,
        likes_count: 0,
        comments_count: 0,
        is_liked_by_user: false,
      };

      if (get().feedType === 'public' && data.privacy === 'public') {
        set({ posts: [postWithUser, ...get().posts] });
      }

      return postWithUser;
    } catch (error: any) {
      console.error('Error creating post:', error);
      throw error;
    }
  },

  updatePost: async (postId, updates) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', postId);

      if (error) throw error;

      // Update in local state
      set({
        posts: get().posts.map(post =>
          post.id === postId ? { ...post, ...updates } : post
        ),
      });
    } catch (error: any) {
      console.error('Error updating post:', error);
      throw error;
    }
  },

  deletePost: async (postId) => {
    try {
      // Soft delete
      const { error } = await supabase
        .from('posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', postId);

      if (error) throw error;

      // Remove from local state
      set({
        posts: get().posts.filter(post => post.id !== postId),
      });
    } catch (error: any) {
      console.error('Error deleting post:', error);
      throw error;
    }
  },

  likePost: async (postId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Optimistic update
      set({
        posts: get().posts.map(post =>
          post.id === postId
            ? {
                ...post,
                likes_count: post.likes_count + 1,
                is_liked_by_user: true,
              }
            : post
        ),
      });

      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id });

      if (error) {
        // Revert optimistic update
        set({
          posts: get().posts.map(post =>
            post.id === postId
              ? {
                  ...post,
                  likes_count: post.likes_count - 1,
                  is_liked_by_user: false,
                }
              : post
          ),
        });
        throw error;
      }
    } catch (error: any) {
      console.error('Error liking post:', error);
      throw error;
    }
  },

  unlikePost: async (postId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Optimistic update
      set({
        posts: get().posts.map(post =>
          post.id === postId
            ? {
                ...post,
                likes_count: post.likes_count - 1,
                is_liked_by_user: false,
              }
            : post
        ),
      });

      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) {
        // Revert optimistic update
        set({
          posts: get().posts.map(post =>
            post.id === postId
              ? {
                  ...post,
                  likes_count: post.likes_count + 1,
                  is_liked_by_user: true,
                }
              : post
          ),
        });
        throw error;
      }
    } catch (error: any) {
      console.error('Error unliking post:', error);
      throw error;
    }
  },

  loadNewPosts: () => {
    set({ newPostsCount: 0 });
    get().fetchPosts(true);
  },

  subscribeToNewPosts: (userId) => {
    const channel = supabase
      .channel('public-posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: 'privacy=eq.public',
        },
        (payload) => {
          // Don't count user's own posts
          if (payload.new.user_id !== userId) {
            set({ newPostsCount: get().newPostsCount + 1 });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
