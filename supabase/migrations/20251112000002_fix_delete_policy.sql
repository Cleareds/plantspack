-- Fix DELETE policy to allow users to soft-delete their own posts
-- The issue is that soft delete uses UPDATE, and the policy needs to allow
-- updating the deleted_at field even if the post would be filtered by SELECT policy

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "posts_update_policy" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;

-- Create new UPDATE policy that allows updating deleted_at
CREATE POLICY "posts_update_policy"
  ON public.posts
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- Ensure DELETE policy exists (for hard deletes if needed)
DROP POLICY IF EXISTS "posts_delete_policy" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

CREATE POLICY "posts_delete_policy"
  ON public.posts
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
  );
