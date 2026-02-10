-- Fix DELETE policies for user-owned content
-- Ensures users can remove their own likes, favorites, follows, etc.

-- ============================================
-- FAVORITE PLACES - DELETE policy
-- ============================================
DROP POLICY IF EXISTS "Users can unfavorite places" ON public.favorite_places;
DROP POLICY IF EXISTS "Users can delete their own favorite places" ON public.favorite_places;

CREATE POLICY "Users can unfavorite places"
  ON public.favorite_places FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POST LIKES - DELETE policy
-- ============================================
DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.post_likes;

CREATE POLICY "Users can unlike posts"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POST REACTIONS - DELETE policy
-- ============================================
DROP POLICY IF EXISTS "Users can remove reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.post_reactions;

CREATE POLICY "Users can remove reactions"
  ON public.post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FOLLOWS - DELETE policy
-- ============================================
DROP POLICY IF EXISTS "Users can unfollow others" ON public.follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.follows;

CREATE POLICY "Users can unfollow others"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================
-- PLACE REVIEWS - DELETE policy (soft delete via update, but ensure DELETE works)
-- ============================================
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.place_reviews;

CREATE POLICY "Users can delete their own reviews"
  ON public.place_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PLACE REVIEW REACTIONS - DELETE policy
-- ============================================
DROP POLICY IF EXISTS "Users can remove review reactions" ON public.place_review_reactions;

CREATE POLICY "Users can remove review reactions"
  ON public.place_review_reactions FOR DELETE
  USING (auth.uid() = user_id);
