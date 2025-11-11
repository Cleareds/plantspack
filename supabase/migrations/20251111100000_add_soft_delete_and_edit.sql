-- Add soft delete and edit tracking to posts and comments
-- Phase 1.1: Post Edit/Delete

-- Add columns to posts table
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Add columns to comments table
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Create indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_posts_deleted_at ON public.posts (deleted_at);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON public.comments (deleted_at);

-- Create indexes for edit tracking
CREATE INDEX IF NOT EXISTS idx_posts_edited_at ON public.posts (edited_at);
CREATE INDEX IF NOT EXISTS idx_comments_edited_at ON public.comments (edited_at);

-- Update RLS policies to exclude deleted posts/comments
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;

-- Recreate policies with deleted_at filter
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (deleted_at IS NULL AND (privacy = 'public' OR auth.uid() IN (
    SELECT follower_id FROM public.follows WHERE following_id = user_id
  )));

CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT
  USING (deleted_at IS NULL);

-- Create function to update edit timestamp
CREATE OR REPLACE FUNCTION update_edited_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.edited_at = NOW();
    NEW.edit_count = OLD.edit_count + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for edit tracking
DROP TRIGGER IF EXISTS posts_edited_at ON public.posts;
CREATE TRIGGER posts_edited_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION update_edited_at();

DROP TRIGGER IF EXISTS comments_edited_at ON public.comments;
CREATE TRIGGER comments_edited_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_edited_at();

-- Add comment about migration
COMMENT ON COLUMN public.posts.deleted_at IS 'Soft delete timestamp - posts are never actually deleted';
COMMENT ON COLUMN public.posts.edited_at IS 'Last edit timestamp';
COMMENT ON COLUMN public.posts.edit_count IS 'Number of times post was edited';
