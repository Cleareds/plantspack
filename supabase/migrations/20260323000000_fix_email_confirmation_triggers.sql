-- Fix "Error confirming user" caused by triggers failing during email confirmation
-- The chain: auth.users update → handle_new_user_confirmed → INSERT public.users
--   → handle_new_user_registration → early bird check → FAILS → rolls back everything

-- 1. Make the early bird trigger safe by wrapping in exception handler
CREATE OR REPLACE FUNCTION handle_new_user_registration()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    -- Check if user qualifies for early bird promotion
    IF check_early_bird_eligibility(NEW.id) THEN
      PERFORM grant_early_bird_subscription(NEW.id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail - promotional grants should never block user creation
    RAISE WARNING 'Early bird promotion check failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Make the email confirmation trigger safe too
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
      BEGIN
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

        -- Ensure not empty
        IF generated_username = '' OR generated_username IS NULL THEN
          generated_username := 'user';
        END IF;

        -- Make username unique
        final_username := generated_username;
        LOOP
          SELECT EXISTS (
            SELECT 1 FROM public.users WHERE username = final_username
          ) INTO username_exists;

          EXIT WHEN NOT username_exists;

          final_username := generated_username || counter::text;
          counter := counter + 1;

          -- Safety valve
          IF counter > 100 THEN
            final_username := generated_username || floor(random() * 10000)::text;
            EXIT;
          END IF;
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
      EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't block confirmation
        RAISE WARNING 'Profile creation in trigger failed for user %: %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
