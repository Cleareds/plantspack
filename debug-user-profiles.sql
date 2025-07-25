-- Debug User Profile Creation Issues
-- Run this to check what's happening with user profiles

-- Check recent auth.users entries
SELECT 
  'Recent auth.users' as check_type,
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check recent public.users entries
SELECT 
  'Recent public.users' as check_type,
  id,
  email,
  username,
  first_name,
  last_name,
  bio,
  created_at
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if triggers exist and are working
SELECT 
  'Trigger Status' as check_type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%auth_user%';

-- Check function exists
SELECT 
  'Function Status' as check_type,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Find users with missing profile data
SELECT 
  'Users with Missing Data' as check_type,
  id,
  email,
  username,
  first_name,
  last_name,
  CASE 
    WHEN username LIKE 'user_%' THEN 'Generated Username'
    WHEN first_name IS NULL OR first_name = '' THEN 'Missing First Name'
    WHEN last_name IS NULL OR last_name = '' THEN 'Missing Last Name'
    ELSE 'Complete Profile'
  END as issue
FROM public.users 
WHERE username LIKE 'user_%' 
   OR first_name IS NULL 
   OR first_name = ''
   OR last_name IS NULL 
   OR last_name = ''
ORDER BY created_at DESC;

-- Manual fix for users with generated usernames (run this if needed)
-- UPDATE public.users 
-- SET username = 'your_desired_username',
--     first_name = 'Your First Name',
--     last_name = 'Your Last Name'
-- WHERE id = 'your-user-id-here';