-- Add parent_comment_id for comment threading (1-level nesting)
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.comments(id);

-- Index for fast reply lookups
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id
  ON public.comments (parent_comment_id)
  WHERE parent_comment_id IS NOT NULL;
