-- ============================================
-- FINAL FIX FOR UNAUTHORIZED ERROR
-- This script completely rebuilds all RLS policies
-- ============================================

-- First, let's see what we currently have
SELECT '========== CURRENT POLICIES ON POSTS ==========' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'posts';

-- ============================================
-- STEP 1: COMPLETELY REMOVE ALL EXISTING POLICIES
-- ============================================
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Drop every single policy on posts table
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'posts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.posts', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
END $$;

-- ============================================
-- STEP 2: CREATE NEW POLICIES WITH CORRECT SYNTAX
-- ============================================

-- Policy 1: SELECT - Anyone can view non-deleted public posts
CREATE POLICY "posts_select_policy"
  ON public.posts
  FOR SELECT
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

-- Policy 2: INSERT - Authenticated users can create posts
CREATE POLICY "posts_insert_policy"
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: UPDATE - Users can update their own posts
CREATE POLICY "posts_update_policy"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: DELETE - Users can delete their own posts (not used but good to have)
CREATE POLICY "posts_delete_policy"
  ON public.posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- STEP 3: FIX COMMENTS POLICIES TOO
-- ============================================

-- Drop all comment policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'comments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.comments', policy_record.policyname);
  END LOOP;
END $$;

-- Create new comment policies
CREATE POLICY "comments_select_policy"
  ON public.comments FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "comments_insert_policy"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_update_policy"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STEP 4: FIX POST_LIKES POLICIES
-- ============================================

-- Drop all post_likes policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'post_likes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.post_likes', policy_record.policyname);
  END LOOP;
END $$;

-- Create new post_likes policies
CREATE POLICY "post_likes_select_policy"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "post_likes_insert_policy"
  ON public.post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_likes_delete_policy"
  ON public.post_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- VERIFICATION
-- ============================================
SELECT '========== NEW POLICIES ON POSTS ==========' as info;
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'posts'
ORDER BY cmd, policyname;

-- ============================================
-- TEST QUERY (replace with your user_id)
-- ============================================
-- To test if UPDATE works, run this as your authenticated user:
-- UPDATE posts SET content = content WHERE id = 'your-post-id';
-- If it works, you're good! If not, check:
-- 1. Is RLS enabled? SELECT relrowsecurity FROM pg_class WHERE relname = 'posts';
-- 2. Are you authenticated? SELECT auth.uid();

SELECT '========== VERIFICATION COMPLETE ==========' as info;
SELECT 'RLS Enabled: ' || relrowsecurity::text as status
FROM pg_class WHERE relname = 'posts';

SELECT 'Total Policies: ' || COUNT(*)::text as total
FROM pg_policies WHERE tablename = 'posts';

-- SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ RLS POLICIES COMPLETELY REBUILT';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'New policies created:';
  RAISE NOTICE '✅ posts_select_policy (SELECT)';
  RAISE NOTICE '✅ posts_insert_policy (INSERT)';
  RAISE NOTICE '✅ posts_update_policy (UPDATE) ← This fixes Unauthorized';
  RAISE NOTICE '✅ posts_delete_policy (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE 'Try editing a post now!';
END $$;
