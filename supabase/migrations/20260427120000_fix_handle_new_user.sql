-- Inspect and fix the handle_new_user() function that was created outside migrations.
-- It fires on INSERT, UPDATE (confirmed), and UPDATE (updated) of auth.users.
-- The INSERT trigger (on_auth_user_created) is causing "Database error saving new user".
-- Replace with a safe SECURITY DEFINER version that wraps everything in an exception handler.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Safe insert: only runs on INSERT events (new user created).
  -- UPDATE events (email confirmed, profile updated) are handled by
  -- handle_new_user_confirmed() which already has its own exception handler.
  IF TG_OP = 'INSERT' THEN
    BEGIN
      INSERT INTO public.users (
        id,
        email,
        username,
        first_name,
        last_name,
        bio
      )
      VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(
          NEW.raw_user_meta_data->>'username',
          NEW.raw_user_meta_data->>'preferred_username',
          NEW.raw_user_meta_data->>'user_name',
          lower(regexp_replace(split_part(COALESCE(NEW.email,'user@example.com'), '@', 1), '[^a-z0-9_-]', '', 'g')),
          'user'
        ),
        COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'given_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'family_name', ''),
        ''
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Never block user creation; log and move on
      RAISE WARNING 'handle_new_user INSERT failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;
