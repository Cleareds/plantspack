-- ============================================
-- COMPREHENSIVE DIAGNOSTIC SCRIPT
-- Run this in Supabase SQL Editor and share ALL output
-- ============================================

-- 1. Check if RLS is enabled
SELECT '========== RLS STATUS ==========' as section;
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('posts', 'comments', 'post_likes')
ORDER BY tablename;

-- 2. List ALL policies with FULL details
SELECT '========== ALL POLICIES ON POSTS TABLE ==========' as section;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'posts'
ORDER BY cmd, policyname;

-- 3. Check what auth.uid() returns (this should show your user ID)
SELECT '========== CURRENT USER ==========' as section;
SELECT
  auth.uid() as current_user_id,
  CASE
    WHEN auth.uid() IS NULL THEN '❌ NOT AUTHENTICATED'
    ELSE '✅ AUTHENTICATED'
  END as auth_status;

-- 4. Check if you own any posts
SELECT '========== YOUR POSTS ==========' as section;
SELECT
  id,
  user_id,
  CASE
    WHEN user_id = auth.uid() THEN '✅ YOU OWN THIS'
    ELSE '❌ NOT YOURS'
  END as ownership,
  post_type,
  LEFT(content, 50) as content_preview,
  created_at
FROM posts
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- 5. Test if UPDATE would work on a specific post
SELECT '========== UPDATE PERMISSION TEST ==========' as section;
SELECT
  id,
  user_id,
  auth.uid() as current_user,
  user_id = auth.uid() as should_be_able_to_update,
  deleted_at,
  CASE
    WHEN deleted_at IS NOT NULL THEN '❌ POST IS DELETED'
    WHEN user_id = auth.uid() THEN '✅ SHOULD BE ABLE TO UPDATE'
    ELSE '❌ NOT YOUR POST'
  END as update_status
FROM posts
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check posts table structure
SELECT '========== POSTS TABLE COLUMNS ==========' as section;
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name IN ('id', 'user_id', 'content', 'quote_content', 'post_type', 'deleted_at', 'privacy')
ORDER BY ordinal_position;

-- 7. Test query that should work for SELECT
SELECT '========== CAN YOU SELECT YOUR OWN POSTS? ==========' as section;
SELECT COUNT(*) as your_posts_count
FROM posts
WHERE user_id = auth.uid();

-- 8. Check if there are any triggers that might interfere
SELECT '========== TRIGGERS ON POSTS TABLE ==========' as section;
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'posts';

-- ============================================
-- INSTRUCTIONS
-- ============================================
-- After running this, share ALL the output sections.
-- This will help identify:
-- 1. If RLS is properly enabled
-- 2. If policies are correctly created
-- 3. If your auth session is working
-- 4. If you actually own the posts you're trying to edit
-- 5. Any other configuration issues
