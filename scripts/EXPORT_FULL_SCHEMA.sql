-- ============================================
-- FULL DATABASE EXPORT FOR DIAGNOSIS
-- Run this in Supabase SQL Editor
-- Copy ALL output and share it
-- ============================================

-- SECTION 1: Table Definitions
SELECT '========== POSTS TABLE STRUCTURE ==========' as section;
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'posts'
ORDER BY ordinal_position;

-- SECTION 2: All Constraints
SELECT '========== CONSTRAINTS ==========' as section;
SELECT
  tc.constraint_name,
  tc.constraint_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'posts'
ORDER BY tc.constraint_type, tc.constraint_name;

-- SECTION 3: RLS Status
SELECT '========== RLS STATUS ==========' as section;
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  pg_class.relforcerowsecurity as force_rls
FROM pg_tables
JOIN pg_class ON pg_tables.tablename = pg_class.relname
WHERE schemaname = 'public'
  AND tablename IN ('posts', 'comments', 'post_likes')
ORDER BY tablename;

-- SECTION 4: ALL Policy Details (MOST IMPORTANT)
SELECT '========== COMPLETE POLICY DETAILS ==========' as section;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles::text,
  cmd,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
FROM pg_policies
JOIN pg_policy pol ON pg_policies.policyname = pol.polname
WHERE schemaname = 'public' AND tablename = 'posts'
ORDER BY cmd, policyname;

-- SECTION 5: Auth Check
SELECT '========== AUTH STATUS ==========' as section;
SELECT
  auth.uid() as current_user_id,
  auth.role() as current_role,
  CASE
    WHEN auth.uid() IS NULL THEN '❌ NOT AUTHENTICATED'
    WHEN auth.role() = 'authenticated' THEN '✅ AUTHENTICATED'
    ELSE '⚠️ ROLE: ' || auth.role()
  END as status;

-- SECTION 6: Your Posts
SELECT '========== YOUR POSTS (First 3) ==========' as section;
SELECT
  id,
  user_id,
  post_type,
  privacy,
  deleted_at,
  LEFT(content, 50) || '...' as content_preview,
  created_at
FROM posts
WHERE user_id = auth.uid()
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 3;

-- SECTION 7: Test UPDATE Permission
SELECT '========== SIMULATED UPDATE CHECK ==========' as section;
WITH test_post AS (
  SELECT id, user_id
  FROM posts
  WHERE user_id = auth.uid() AND deleted_at IS NULL
  LIMIT 1
)
SELECT
  id as post_id,
  user_id as post_owner,
  auth.uid() as current_user,
  auth.role() as current_role,
  (user_id = auth.uid()) as ownership_check,
  CASE
    WHEN user_id = auth.uid() AND auth.role() = 'authenticated' THEN '✅ SHOULD WORK'
    WHEN user_id != auth.uid() THEN '❌ NOT YOUR POST'
    WHEN auth.role() != 'authenticated' THEN '❌ NOT AUTHENTICATED ROLE'
    ELSE '❌ UNKNOWN ISSUE'
  END as expected_result
FROM test_post;

-- SECTION 8: Check if policies are blocking
SELECT '========== POLICY APPLICATION TEST ==========' as section;
SELECT
  'posts_update_policy' as policy_name,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'posts'
      AND policyname = 'posts_update_policy'
      AND cmd = 'UPDATE'
  ) as policy_exists,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'posts'
      AND policyname = 'posts_update_policy'
      AND 'authenticated' = ANY(roles)
  ) as has_authenticated_role;

-- SECTION 9: Check migration history
SELECT '========== MIGRATION HISTORY ==========' as section;
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;

-- SECTION 10: Summary
SELECT '========== DIAGNOSTIC SUMMARY ==========' as section;
SELECT
  'Total Policies on posts' as metric,
  COUNT(*)::text as value
FROM pg_policies
WHERE tablename = 'posts'
UNION ALL
SELECT
  'RLS Enabled',
  rowsecurity::text
FROM pg_tables
WHERE tablename = 'posts'
UNION ALL
SELECT
  'Your posts count',
  COUNT(*)::text
FROM posts
WHERE user_id = auth.uid()
UNION ALL
SELECT
  'Auth Status',
  CASE WHEN auth.uid() IS NOT NULL THEN 'Authenticated' ELSE 'Not Authenticated' END
UNION ALL
SELECT
  'Current Role',
  COALESCE(auth.role(), 'none');
