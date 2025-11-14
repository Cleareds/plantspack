-- ============================================
-- ADD BLOCK FILTERING TO POSTS POLICY
-- Run this AFTER 20251113100000 migration succeeds
-- This enhances the posts policy to filter blocked users
-- ============================================

-- Drop the basic policy created in previous migration
DROP POLICY IF EXISTS "posts_select_basic" ON public.posts;

-- Create enhanced policy with block filtering
-- This checks if deleted_at column exists first
DO $$
DECLARE
  has_deleted_at BOOLEAN;
BEGIN
  -- Check if deleted_at column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'posts'
      AND column_name = 'deleted_at'
  ) INTO has_deleted_at;

  IF has_deleted_at THEN
    -- Create policy WITH deleted_at filter
    CREATE POLICY "posts_select_with_blocks" ON public.posts
      FOR SELECT TO authenticated
      USING (
        deleted_at IS NULL
        AND (
          privacy = 'public'
          OR posts.user_id = auth.uid()
          OR (
            privacy = 'friends'
            AND EXISTS (
              SELECT 1 FROM public.follows
              WHERE follows.follower_id = auth.uid()
              AND follows.following_id = posts.user_id
            )
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.user_blocks ub1
          WHERE ub1.blocker_id = auth.uid()
          AND ub1.blocked_id = posts.user_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.user_blocks ub2
          WHERE ub2.blocker_id = posts.user_id
          AND ub2.blocked_id = auth.uid()
        )
      );
  ELSE
    -- Create policy WITHOUT deleted_at filter
    CREATE POLICY "posts_select_with_blocks" ON public.posts
      FOR SELECT TO authenticated
      USING (
        (
          privacy = 'public'
          OR posts.user_id = auth.uid()
          OR (
            privacy = 'friends'
            AND EXISTS (
              SELECT 1 FROM public.follows
              WHERE follows.follower_id = auth.uid()
              AND follows.following_id = posts.user_id
            )
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.user_blocks ub1
          WHERE ub1.blocker_id = auth.uid()
          AND ub1.blocked_id = posts.user_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.user_blocks ub2
          WHERE ub2.blocker_id = posts.user_id
          AND ub2.blocked_id = auth.uid()
        )
      );
  END IF;
END $$;

COMMENT ON POLICY "posts_select_with_blocks" ON public.posts IS
  'Allow viewing posts based on privacy and blocking status - users cannot see posts from blocked users or users who blocked them';
