-- Harden handle_new_user(): sanitize usernames from ALL sources, not just the
-- email-prefix fallback. Mobile / OAuth signups can put a display name (with
-- spaces + caps, e.g. "J Bearcat") in raw_user_meta_data.username /
-- preferred_username / user_name, which was previously inserted RAW — producing
-- usernames that break profile URLs (/profile/J%20Bearcat -> 404) and mentions.
-- Now every source is lowercased + stripped to [a-z0-9_-]; empties fall through.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    BEGIN
      INSERT INTO public.users (
        id, email, username, first_name, last_name, bio
      )
      VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(
          NULLIF(lower(regexp_replace(NEW.raw_user_meta_data->>'username', '[^a-z0-9_-]', '', 'g')), ''),
          NULLIF(lower(regexp_replace(NEW.raw_user_meta_data->>'preferred_username', '[^a-z0-9_-]', '', 'g')), ''),
          NULLIF(lower(regexp_replace(NEW.raw_user_meta_data->>'user_name', '[^a-z0-9_-]', '', 'g')), ''),
          NULLIF(lower(regexp_replace(split_part(COALESCE(NEW.email,'user@example.com'), '@', 1), '[^a-z0-9_-]', '', 'g')), ''),
          'user'
        ),
        COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'given_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'family_name', ''),
        ''
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user INSERT failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;
