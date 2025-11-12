-- Verification Script - Run this to confirm the migration worked
-- This WILL return rows showing what was added

-- ============================================
-- 1. Check all required columns exist
-- ============================================
SELECT
  '✅ Columns Check' as check_type,
  CASE
    WHEN COUNT(*) = 6 THEN '✅ ALL 6 COLUMNS EXIST'
    ELSE '❌ MISSING ' || (6 - COUNT(*))::text || ' COLUMNS'
  END as result,
  STRING_AGG(column_name, ', ') as columns_found
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name IN ('post_type', 'parent_post_id', 'quote_content', 'deleted_at', 'edited_at', 'images')

UNION ALL

-- ============================================
-- 2. Check RLS is enabled
-- ============================================
SELECT
  '✅ RLS Check' as check_type,
  CASE
    WHEN rowsecurity = true THEN '✅ RLS IS ENABLED'
    ELSE '❌ RLS IS DISABLED'
  END as result,
  'posts table' as columns_found
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'posts'

UNION ALL

-- ============================================
-- 3. Check required RLS policies exist
-- ============================================
SELECT
  '✅ Policies Check' as check_type,
  CASE
    WHEN COUNT(*) >= 3 THEN '✅ ALL POLICIES EXIST (' || COUNT(*)::text || ' total)'
    ELSE '❌ MISSING POLICIES (only ' || COUNT(*)::text || ' found)'
  END as result,
  STRING_AGG(policyname || ' (' || cmd::text || ')', ', ') as columns_found
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'posts'
  AND cmd IN ('SELECT', 'INSERT', 'UPDATE');

-- ============================================
-- Expected Results:
-- ============================================
-- Row 1: ✅ ALL 6 COLUMNS EXIST
-- Row 2: ✅ RLS IS ENABLED
-- Row 3: ✅ ALL POLICIES EXIST (3+ total)
--
-- If you see all green checkmarks ✅, the migration worked perfectly!
