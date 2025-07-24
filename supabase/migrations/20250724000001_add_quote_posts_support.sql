-- Add support for quote posts/sharing
ALTER TABLE posts 
ADD COLUMN parent_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
ADD COLUMN post_type TEXT CHECK (post_type IN ('original', 'share', 'quote')) DEFAULT 'original',
ADD COLUMN quote_content TEXT;

-- Add index for parent post lookups
CREATE INDEX idx_posts_parent_post_id ON posts(parent_post_id);

-- Add RLS policy for quote posts
DROP POLICY IF EXISTS "Users can view posts based on privacy" ON posts;
CREATE POLICY "Users can view posts based on privacy" ON posts
  FOR SELECT USING (
    privacy = 'public' OR 
    (privacy = 'friends' AND (
      user_id = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM follows 
        WHERE follower_id = auth.uid() AND following_id = user_id
      )
    ))
  );