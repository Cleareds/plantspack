-- Add comprehensive RLS policies for all user operations
-- This migration adds INSERT, UPDATE, DELETE policies that were missing

-- ============================================
-- POSTS POLICIES
-- ============================================
-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can view posts based on privacy" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

-- SELECT policy: View posts based on privacy settings
CREATE POLICY "Users can view posts"
  ON public.posts FOR SELECT
  USING (
    deleted_at IS NULL AND (
      privacy = 'public' OR
      (privacy = 'friends' AND (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.follows
          WHERE follower_id = auth.uid() AND following_id = user_id
        )
      ))
    )
  );

-- INSERT policy: Users can create posts
CREATE POLICY "Users can insert posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Users can update their own posts (for both edits and soft deletes)
CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- COMMENTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

-- SELECT policy: View non-deleted comments
CREATE POLICY "Users can view comments"
  ON public.comments FOR SELECT
  USING (deleted_at IS NULL);

-- INSERT policy: Users can create comments
CREATE POLICY "Users can insert comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Users can update their own comments (for both edits and soft deletes)
CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- POST LIKES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;

-- Policy: Users can like posts
CREATE POLICY "Users can like posts"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can unlike posts
CREATE POLICY "Users can unlike posts"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FOLLOWS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow others" ON public.follows;

-- Policy: Users can follow others
CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Policy: Users can unfollow others
CREATE POLICY "Users can unfollow others"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================
-- PLACES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can add places" ON public.places;
DROP POLICY IF EXISTS "Users can update their places" ON public.places;
DROP POLICY IF EXISTS "Users can delete their places" ON public.places;

-- Policy: Users can add places
CREATE POLICY "Users can add places"
  ON public.places FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their places
CREATE POLICY "Users can update their places"
  ON public.places FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete their places
CREATE POLICY "Users can delete their places"
  ON public.places FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================
-- FAVORITE PLACES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can favorite places" ON public.favorite_places;
DROP POLICY IF EXISTS "Users can unfavorite places" ON public.favorite_places;

-- Policy: Users can favorite places
CREATE POLICY "Users can favorite places"
  ON public.favorite_places FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can unfavorite places
CREATE POLICY "Users can unfavorite places"
  ON public.favorite_places FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- USERS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add comments for documentation
COMMENT ON POLICY "Users can insert posts" ON public.posts IS 'Allow authenticated users to create posts';
COMMENT ON POLICY "Users can update their own posts" ON public.posts IS 'Allow users to edit and soft delete their own posts';
