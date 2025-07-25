-- VeganConnect - Test Registration Setup
-- Run this to test if your triggers and permissions are working

-- Step 1: Check if triggers exist
SELECT 
  'Triggers' as check_type,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%auth_user%'
ORDER BY trigger_name;

-- Step 2: Check if function exists
SELECT 
  'Function' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Step 3: Test if we can insert into users table directly
-- (This tests permissions and table structure)
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- Try to insert a test user profile
  INSERT INTO public.users (
    id,
    email,
    username,
    first_name,
    last_name,
    bio
  ) VALUES (
    test_user_id,
    'test-insert@example.com',
    'testuser_' || substring(test_user_id::text, 1, 8),
    'Test',
    'User',
    'Test insertion'
  );
  
  -- Clean up the test user
  DELETE FROM public.users WHERE id = test_user_id;
  
  RAISE NOTICE '✅ Direct user insertion works - permissions OK';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE '❌ Direct user insertion failed: %', SQLERRM;
END $$;

-- Step 4: Check users table structure
SELECT 
  'Users Table' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Step 5: Check current auth.users (should be empty or have existing users)
SELECT 
  'Auth Users Count' as check_type,
  COUNT(*) as count
FROM auth.users;

-- Step 6: Check public.users (should be empty or have existing users)
SELECT 
  'Public Users Count' as check_type,
  COUNT(*) as count
FROM public.users;

-- Step 7: Instructions for manual testing
SELECT '📋 NEXT STEPS FOR TESTING:' as instructions
UNION ALL
SELECT '1. Check the results above for any ❌ errors'
UNION ALL
SELECT '2. Go to your app and try registering a new user'
UNION ALL
SELECT '3. Check browser console for debug logs'
UNION ALL
SELECT '4. Run this query after registration attempt:'
UNION ALL
SELECT '   SELECT * FROM auth.users ORDER BY created_at DESC LIMIT 1;'
UNION ALL
SELECT '   SELECT * FROM public.users ORDER BY created_at DESC LIMIT 1;';