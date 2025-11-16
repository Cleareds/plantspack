-- Fix RLS policies for hashtags and post_hashtags to allow authenticated users to create them

-- Allow authenticated users to create hashtags
DROP POLICY IF EXISTS "Authenticated users can create hashtags" ON hashtags;
CREATE POLICY "Authenticated users can create hashtags" ON hashtags
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update hashtags (for usage count triggers)
DROP POLICY IF EXISTS "Authenticated users can update hashtags" ON hashtags;
CREATE POLICY "Authenticated users can update hashtags" ON hashtags
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to link their posts to hashtags
DROP POLICY IF EXISTS "Authenticated users can create post hashtags" ON post_hashtags;
CREATE POLICY "Authenticated users can create post hashtags" ON post_hashtags
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_hashtags.post_id
      AND posts.user_id = auth.uid()
    )
  );

-- Allow authenticated users to delete their own post hashtags
DROP POLICY IF EXISTS "Users can delete their own post hashtags" ON post_hashtags;
CREATE POLICY "Users can delete their own post hashtags" ON post_hashtags
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_hashtags.post_id
      AND posts.user_id = auth.uid()
    )
  );
