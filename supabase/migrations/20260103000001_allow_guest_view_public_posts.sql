-- Allow anonymous (guest) users to view public posts
-- This enables the public feed for non-logged-in users

-- Add SELECT policy for anonymous users to view public posts only
CREATE POLICY "posts_select_policy_anon"
  ON public.posts
  FOR SELECT
  TO anon
  USING (
    -- Only show non-deleted, public posts
    deleted_at IS NULL
    AND privacy = 'public'
  );

-- Add comment for documentation
COMMENT ON POLICY "posts_select_policy_anon" ON public.posts IS
  'Allow anonymous users to view public posts only';
