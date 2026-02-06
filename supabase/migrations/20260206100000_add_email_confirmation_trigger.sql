-- Migration: Add trigger to create user profile on email confirmation
-- This ensures that when a user confirms their email, their profile is created automatically

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user_confirmed CASCADE;

-- Create function to handle newly confirmed users
CREATE OR REPLACE FUNCTION public.handle_new_user_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_metadata jsonb;
  user_email text;
  generated_username text;
  final_username text;
  counter integer := 1;
  username_exists boolean;
BEGIN
  -- Only proceed if email is being confirmed (was null, now not null)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Check if user already has a profile
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
      user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
      user_email := COALESCE(NEW.email, '');

      -- Generate username from metadata or email
      generated_username := COALESCE(
        user_metadata->>'username',
        user_metadata->>'preferred_username',
        user_metadata->>'user_name',
        split_part(user_email, '@', 1)
      );

      -- Sanitize username (lowercase, no spaces)
      generated_username := lower(regexp_replace(generated_username, '\s+', '', 'g'));

      -- Make username unique
      final_username := generated_username;
      LOOP
        SELECT EXISTS (
          SELECT 1 FROM public.users WHERE username = final_username
        ) INTO username_exists;

        EXIT WHEN NOT username_exists;

        final_username := generated_username || counter::text;
        counter := counter + 1;
      END LOOP;

      -- Create user profile
      INSERT INTO public.users (
        id,
        email,
        username,
        first_name,
        last_name,
        avatar_url,
        bio
      ) VALUES (
        NEW.id,
        user_email,
        final_username,
        COALESCE(user_metadata->>'first_name', user_metadata->>'given_name', ''),
        COALESCE(user_metadata->>'last_name', user_metadata->>'family_name', ''),
        user_metadata->>'avatar_url',
        ''
      );

      RAISE NOTICE 'Created profile for user % with username %', NEW.id, final_username;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
-- This trigger fires after a user's email is confirmed
DROP TRIGGER IF EXISTS on_user_email_confirmed ON auth.users;
CREATE TRIGGER on_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_confirmed();

-- Add comment
COMMENT ON FUNCTION public.handle_new_user_confirmed IS 'Automatically creates a user profile when email is confirmed';
COMMENT ON TRIGGER on_user_email_confirmed ON auth.users IS 'Creates user profile on email confirmation';
