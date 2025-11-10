-- Add missing metadata columns to posts table
-- This migration adds columns that don't exist yet without duplicating existing ones

-- Add metadata columns to posts table
DO $$
BEGIN
  -- Add tags column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'posts'
    AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN tags TEXT[] DEFAULT '{}';
    CREATE INDEX IF NOT EXISTS idx_posts_tags ON public.posts USING GIN (tags);
  END IF;

  -- Add location_city column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'posts'
    AND column_name = 'location_city'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN location_city TEXT;
    CREATE INDEX IF NOT EXISTS idx_posts_location_city ON public.posts (location_city);
  END IF;

  -- Add location_region column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'posts'
    AND column_name = 'location_region'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN location_region TEXT;
  END IF;

  -- Add place_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'posts'
    AND column_name = 'place_id'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN place_id UUID REFERENCES public.places(id);
  END IF;

  -- Add mood column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'posts'
    AND column_name = 'mood'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN mood TEXT CHECK (mood IN ('positive', 'educational', 'question', 'celebration', 'neutral'));
    CREATE INDEX IF NOT EXISTS idx_posts_mood ON public.posts (mood);
  END IF;

  -- Add content_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'posts'
    AND column_name = 'content_type'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN content_type TEXT DEFAULT 'general' CHECK (content_type IN ('recipe', 'restaurant_review', 'lifestyle', 'activism', 'general', 'question'));
    CREATE INDEX IF NOT EXISTS idx_posts_content_type ON public.posts (content_type);
  END IF;

  -- Add view_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'posts'
    AND column_name = 'view_count'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;

  -- Add language column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'posts'
    AND column_name = 'language'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN language TEXT DEFAULT 'en';
  END IF;

  -- Add is_featured column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'posts'
    AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;

  -- Add video_urls column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'posts'
    AND column_name = 'video_urls'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN video_urls TEXT[];
  END IF;

  -- Convert engagement_score from INTEGER to REAL if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'posts'
    AND column_name = 'engagement_score'
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE public.posts ALTER COLUMN engagement_score TYPE REAL USING engagement_score::REAL;
  END IF;
END $$;

-- Create combined index for performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at_engagement ON public.posts (created_at DESC, engagement_score DESC);
