-- Temporary diagnostic: expose auth.users triggers and function bodies as callable RPCs
-- Drop after investigation

CREATE OR REPLACE FUNCTION public.debug_auth_triggers()
RETURNS TABLE(trigger_name text, event text, action text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.tgname::text,
    CASE t.tgtype & 28
      WHEN 4  THEN 'INSERT'
      WHEN 8  THEN 'DELETE'
      WHEN 16 THEN 'UPDATE'
      WHEN 20 THEN 'INSERT,DELETE'
      WHEN 28 THEN 'INSERT,UPDATE,DELETE'
      ELSE 'OTHER'
    END,
    p.proname::text
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE n.nspname = 'auth' AND c.relname = 'users'
    AND NOT t.tgisinternal
  ORDER BY t.tgname;
$$;

CREATE OR REPLACE FUNCTION public.debug_handle_new_user_body()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user' LIMIT 1;
$$;
