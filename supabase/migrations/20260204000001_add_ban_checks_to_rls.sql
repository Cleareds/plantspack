-- Add is_banned checks to all content creation RLS policies
-- This ensures banned users cannot create any content

-- ============================================
-- POSTS POLICIES - Add ban check
-- ============================================
DROP POLICY IF EXISTS "Users can insert posts" ON public.posts;

CREATE POLICY "Users can insert posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_banned = false
    )
  );

-- ============================================
-- COMMENTS POLICIES - Add ban check
-- ============================================
DROP POLICY IF EXISTS "Users can insert comments" ON public.comments;

CREATE POLICY "Users can insert comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_banned = false
    )
  );

-- ============================================
-- PLACES POLICIES - Add ban check
-- ============================================
DROP POLICY IF EXISTS "Users can add places" ON public.places;

CREATE POLICY "Users can add places"
  ON public.places FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_banned = false
    )
  );

-- ============================================
-- PACKS POLICIES - Add ban check (if packs table has RLS)
-- ============================================
DROP POLICY IF EXISTS "Users can create packs" ON public.packs;

CREATE POLICY "Users can create packs"
  ON public.packs FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_banned = false
    )
  );

-- ============================================
-- POST LIKES POLICIES - Add ban check
-- ============================================
DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;

CREATE POLICY "Users can like posts"
  ON public.post_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_banned = false
    )
  );

-- ============================================
-- POST REACTIONS POLICIES - Add ban check
-- ============================================
DROP POLICY IF EXISTS "Users can add reactions" ON public.post_reactions;

CREATE POLICY "Users can add reactions"
  ON public.post_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_banned = false
    )
  );

-- ============================================
-- FOLLOWS POLICIES - Add ban check
-- ============================================
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;

CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (
    auth.uid() = follower_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_banned = false
    )
  );

-- ============================================
-- FAVORITE PLACES POLICIES - Add ban check
-- ============================================
DROP POLICY IF EXISTS "Users can favorite places" ON public.favorite_places;

CREATE POLICY "Users can favorite places"
  ON public.favorite_places FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_banned = false
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Users can insert posts" ON public.posts IS 'Allow non-banned authenticated users to create posts';
COMMENT ON POLICY "Users can insert comments" ON public.comments IS 'Allow non-banned authenticated users to create comments';
COMMENT ON POLICY "Users can add places" ON public.places IS 'Allow non-banned authenticated users to add places';
COMMENT ON POLICY "Users can create packs" ON public.packs IS 'Allow non-banned authenticated users to create packs';
