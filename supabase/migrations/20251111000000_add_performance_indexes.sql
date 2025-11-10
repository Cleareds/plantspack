-- Performance optimization indexes for common queries
-- Add missing indexes to improve query performance

-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_privacy ON public.posts (privacy);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON public.posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_privacy_created ON public.posts (privacy, created_at DESC);

-- Post likes table indexes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_user ON public.post_likes (post_id, user_id);

-- Comments table indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON public.comments (post_id, created_at DESC);

-- Follows table indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows (following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_following ON public.follows (follower_id, following_id);

-- Places table indexes
CREATE INDEX IF NOT EXISTS idx_places_created_by ON public.places (created_by);
CREATE INDEX IF NOT EXISTS idx_places_category ON public.places (category);
CREATE INDEX IF NOT EXISTS idx_places_location ON public.places (latitude, longitude);

-- Favorite places indexes
CREATE INDEX IF NOT EXISTS idx_favorite_places_user_id ON public.favorite_places (user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_places_place_id ON public.favorite_places (place_id);

-- Post analytics indexes (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'post_analytics') THEN
    CREATE INDEX IF NOT EXISTS idx_post_analytics_user_id ON public.post_analytics (user_id);
  END IF;
END $$;
