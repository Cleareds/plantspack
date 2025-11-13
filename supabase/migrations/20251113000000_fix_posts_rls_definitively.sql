-- Comprehensive fix for posts RLS policies
-- This migration completely resets and fixes all RLS policies on the posts table

-- ============================================
-- STEP 1: Drop ALL existing policies
-- ============================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'posts'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.posts', pol.policyname);
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Create fresh, correct policies
-- ============================================

-- SELECT policy: Allow viewing based on privacy and deletion status
-- This policy filters what posts are visible
CREATE POLICY "posts_select_policy"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (
    -- Only show non-deleted posts
    deleted_at IS NULL
    AND (
      -- Public posts are visible to everyone
      privacy = 'public'
      OR
      -- Private/friends posts are visible to the owner
      user_id = auth.uid()
      OR
      -- Friends posts are visible to followers
      (
        privacy = 'friends'
        AND EXISTS (
          SELECT 1 FROM public.follows
          WHERE follower_id = auth.uid()
          AND following_id = posts.user_id
        )
      )
    )
  );

-- INSERT policy: Users can create their own posts
CREATE POLICY "posts_insert_policy"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- UPDATE policy: Users can update their own posts
-- IMPORTANT: This does NOT filter by deleted_at in USING clause
-- This allows soft-deleting (setting deleted_at) even on deleted posts
CREATE POLICY "posts_update_policy"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- DELETE policy: Users can hard-delete their own posts
-- IMPORTANT: This does NOT filter by deleted_at in USING clause
-- This allows deleting even if the post would be filtered by SELECT policy
CREATE POLICY "posts_delete_policy"
  ON public.posts
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
  );

-- ============================================
-- STEP 3: Verify RLS is enabled
-- ============================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Add helpful comments
-- ============================================
COMMENT ON POLICY "posts_select_policy" ON public.posts IS
  'Allow viewing posts based on privacy settings and deletion status';

COMMENT ON POLICY "posts_insert_policy" ON public.posts IS
  'Allow users to create posts';

COMMENT ON POLICY "posts_update_policy" ON public.posts IS
  'Allow users to update/edit their own posts and soft-delete them';

COMMENT ON POLICY "posts_delete_policy" ON public.posts IS
  'Allow users to hard-delete their own posts';
