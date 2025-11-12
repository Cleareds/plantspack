-- ============================================
-- COMPLETE FIX FOR UNAUTHORIZED ERROR
-- Copy and paste this ENTIRE file into Supabase SQL Editor and click RUN
-- ============================================

-- STEP 1: Add missing columns (safe to run multiple times)
-- ============================================
DO $$
BEGIN
  -- Add parent_post_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='posts' AND column_name='parent_post_id') THEN
    ALTER TABLE public.posts ADD COLUMN parent_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_posts_parent_post_id ON public.posts(parent_post_id);
    RAISE NOTICE 'Added parent_post_id column';
  ELSE
    RAISE NOTICE 'parent_post_id column already exists';
  END IF;

  -- Add post_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='posts' AND column_name='post_type') THEN
    ALTER TABLE public.posts ADD COLUMN post_type TEXT CHECK (post_type IN ('original', 'share', 'quote')) DEFAULT 'original';
    RAISE NOTICE 'Added post_type column';
  ELSE
    RAISE NOTICE 'post_type column already exists';
  END IF;

  -- Add quote_content column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='posts' AND column_name='quote_content') THEN
    ALTER TABLE public.posts ADD COLUMN quote_content TEXT;
    RAISE NOTICE 'Added quote_content column';
  ELSE
    RAISE NOTICE 'quote_content column already exists';
  END IF;

  -- Add images column (array)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='posts' AND column_name='images') THEN
    ALTER TABLE public.posts ADD COLUMN images TEXT[];
    RAISE NOTICE 'Added images column';
  ELSE
    RAISE NOTICE 'images column already exists';
  END IF;

  -- Add deleted_at, edited_at, edit_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='posts' AND column_name='deleted_at') THEN
    ALTER TABLE public.posts ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    CREATE INDEX IF NOT EXISTS idx_posts_deleted_at ON public.posts(deleted_at);
    RAISE NOTICE 'Added deleted_at column';
  ELSE
    RAISE NOTICE 'deleted_at column already exists';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='posts' AND column_name='edited_at') THEN
    ALTER TABLE public.posts ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
    CREATE INDEX IF NOT EXISTS idx_posts_edited_at ON public.posts(edited_at);
    RAISE NOTICE 'Added edited_at column';
  ELSE
    RAISE NOTICE 'edited_at column already exists';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='posts' AND column_name='edit_count') THEN
    ALTER TABLE public.posts ADD COLUMN edit_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added edit_count column';
  ELSE
    RAISE NOTICE 'edit_count column already exists';
  END IF;
END $$;


-- STEP 2: Fix RLS Policies (THIS FIXES THE UNAUTHORIZED ERROR)
-- ============================================

-- Drop all existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Public posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can view posts based on privacy" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can view posts" ON public.posts;

-- Create SELECT policy
CREATE POLICY "Users can view posts"
  ON public.posts FOR SELECT
  USING (
    deleted_at IS NULL AND (
      privacy = 'public' OR
      (privacy = 'friends' AND (
        user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.follows
          WHERE follower_id = auth.uid() AND following_id = user_id
        )
      ))
    )
  );

-- Create INSERT policy
CREATE POLICY "Users can insert posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create UPDATE policy (THIS IS THE KEY FIX)
CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- STEP 3: Fix similar issues for comments
-- ============================================

-- Add missing columns to comments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='deleted_at') THEN
    ALTER TABLE public.comments ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON public.comments(deleted_at);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='edited_at') THEN
    ALTER TABLE public.comments ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='comments' AND column_name='edit_count') THEN
    ALTER TABLE public.comments ADD COLUMN edit_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Drop and recreate comment policies
DROP POLICY IF EXISTS "Users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Users can view comments" ON public.comments;

CREATE POLICY "Users can view comments"
  ON public.comments FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Users can insert comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- STEP 4: Fix post_likes policies
-- ============================================

DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.post_likes;

CREATE POLICY "Likes are viewable by everyone"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);


-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'What was fixed:';
  RAISE NOTICE '✅ Added missing columns (post_type, parent_post_id, etc.)';
  RAISE NOTICE '✅ Fixed RLS policies for UPDATE operations';
  RAISE NOTICE '✅ You can now edit and delete your own posts';
  RAISE NOTICE '✅ You can now share and quote posts';
  RAISE NOTICE '';
  RAISE NOTICE 'Test it now:';
  RAISE NOTICE '1. Try editing a post (should work ✅)';
  RAISE NOTICE '2. Try deleting a post (should work ✅)';
  RAISE NOTICE '3. Try sharing a post (should work ✅)';
  RAISE NOTICE '';
END $$;
