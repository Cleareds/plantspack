-- Run this in Supabase SQL Editor to check your database state
-- This will help diagnose what's missing

-- ============================================
-- Check if columns exist
-- ============================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name IN ('post_type', 'parent_post_id', 'quote_content', 'deleted_at', 'edited_at', 'images')
ORDER BY column_name;

-- ============================================
-- Check RLS is enabled
-- ============================================
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'posts';

-- ============================================
-- Check existing RLS policies on posts table
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'posts'
ORDER BY policyname;

-- ============================================
-- Expected results:
-- ============================================
-- COLUMNS: Should see 6 rows with these columns:
--   - deleted_at
--   - edited_at
--   - images
--   - parent_post_id
--   - post_type
--   - quote_content
--
-- RLS ENABLED: rowsecurity should be TRUE
--
-- POLICIES: Should see at least these 3 policies:
--   - Users can view posts (SELECT)
--   - Users can insert posts (INSERT)
--   - Users can update their own posts (UPDATE)
