-- Ensure all required columns exist for posts sharing functionality
-- This is idempotent and safe to run multiple times

-- Add columns if they don't exist
DO $$
BEGIN
  -- Add parent_post_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='posts' AND column_name='parent_post_id') THEN
    ALTER TABLE public.posts ADD COLUMN parent_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_posts_parent_post_id ON public.posts(parent_post_id);
  END IF;

  -- Add post_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='posts' AND column_name='post_type') THEN
    ALTER TABLE public.posts ADD COLUMN post_type TEXT CHECK (post_type IN ('original', 'share', 'quote')) DEFAULT 'original';
  END IF;

  -- Add quote_content column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='posts' AND column_name='quote_content') THEN
    ALTER TABLE public.posts ADD COLUMN quote_content TEXT;
  END IF;

  -- Add images column (array) if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='posts' AND column_name='images') THEN
    ALTER TABLE public.posts ADD COLUMN images TEXT[];
  END IF;

  -- Add deleted_at, edited_at, edit_count if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='posts' AND column_name='deleted_at') THEN
    ALTER TABLE public.posts ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    CREATE INDEX IF NOT EXISTS idx_posts_deleted_at ON public.posts(deleted_at);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='posts' AND column_name='edited_at') THEN
    ALTER TABLE public.posts ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
    CREATE INDEX IF NOT EXISTS idx_posts_edited_at ON public.posts(edited_at);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='posts' AND column_name='edit_count') THEN
    ALTER TABLE public.posts ADD COLUMN edit_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.posts.post_type IS 'Type of post: original, share, or quote';
COMMENT ON COLUMN public.posts.parent_post_id IS 'Reference to the original post for shares and quotes';
COMMENT ON COLUMN public.posts.quote_content IS 'User commentary for quote posts';
