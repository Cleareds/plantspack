-- VeganConnect - Final Setup (Works without auth.config)
-- This script only includes what actually works in Supabase Cloud

-- Step 1: Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create user profile when user signs up
  INSERT INTO public.users (
    id,
    email,
    username,
    first_name,
    last_name,
    bio,
    avatar_url,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    '',
    NULL,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = CASE 
      WHEN public.users.username LIKE 'user_%' THEN COALESCE(EXCLUDED.username, public.users.username)
      ELSE public.users.username
    END,
    first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, public.users.last_name),
    updated_at = NOW();
    
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 2: Drop existing triggers and create new ones
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_immediate ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated_immediate ON auth.users;

-- Create trigger that fires on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Also handle updates (when user confirms email, etc.)
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Verify the setup
SELECT 
  'Trigger Check' as component,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') 
    THEN '✅ User creation trigger exists' 
    ELSE '❌ Trigger missing' 
  END as status
UNION ALL
SELECT 
  'Function Check' as component,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user') 
    THEN '✅ User creation function exists' 
    ELSE '❌ Function missing' 
  END as status;

SELECT 'Authentication trigger setup complete! 🎉' as result;

-- IMPORTANT: Go to Supabase Dashboard > Authentication > Settings
-- and MANUALLY disable "Enable email confirmations" if you want immediate signup