-- Phase 1: Category System Migration
-- Introduces a normalized categories reference table and migrates posts.content_type -> posts.category

-- =============================================================================
-- 1. Categories reference table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  slug TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  color TEXT
);

-- Seed category data (idempotent via ON CONFLICT)
INSERT INTO public.categories (slug, display_name, description, icon_name, display_order, is_active, color) VALUES
  ('recipe',    'Recipes',    'Share your plant-based recipes',   'restaurant_menu',  1, true, '#0a6a1d'),
  ('place',     'Places',     'Discover vegan-friendly spots',    'location_on',      2, true, '#72554b'),
  ('event',     'Events',     'Vegan meetups and happenings',     'event',            3, true, '#a83206'),
  ('lifestyle', 'Lifestyle',  'Plant-based living tips',          'self_improvement',  4, true, '#0a6a1d'),
  ('activism',  'Activism',   'Advocacy and awareness',           'campaign',          5, true, '#a83206'),
  ('question',  'Questions',  'Ask the community',                'help',             6, true, '#72554b'),
  ('product',   'Products',   'Vegan product reviews',            'shopping_bag',     7, true, '#72554b'),
  ('general',   'General',    'Everything else',                  'article',          8, true, '#767773')
ON CONFLICT (slug) DO NOTHING;

-- RLS: categories readable by everyone, writable by nobody
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies = nobody can write via RLS

-- =============================================================================
-- 2. Add category column to posts (with FK + CHECK + default)
-- =============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.posts
      ADD COLUMN category TEXT NOT NULL DEFAULT 'general'
      REFERENCES public.categories(slug);
  END IF;
END $$;

-- =============================================================================
-- 3. Add secondary_tags with max-3 constraint
-- =============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'secondary_tags'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN secondary_tags TEXT[] DEFAULT '{}';
    ALTER TABLE public.posts ADD CONSTRAINT chk_secondary_tags_limit
      CHECK (array_length(secondary_tags, 1) IS NULL OR array_length(secondary_tags, 1) <= 3);
  END IF;
END $$;

-- =============================================================================
-- 4. Add structured data JSONB columns
-- =============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'recipe_data'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN recipe_data JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'event_data'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN event_data JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'product_data'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN product_data JSONB;
  END IF;
END $$;

-- =============================================================================
-- 5. Migrate existing content_type -> category
-- =============================================================================
DO $$ BEGIN
  -- Map restaurant_review -> place first (more specific)
  UPDATE public.posts SET category = 'place'
    WHERE content_type = 'restaurant_review' AND category = 'general';

  -- Map remaining content_types that match a category slug directly
  UPDATE public.posts SET category = content_type
    WHERE content_type IS NOT NULL
      AND content_type != 'restaurant_review'
      AND category = 'general'
      AND content_type IN (SELECT slug FROM public.categories);
END $$;

-- =============================================================================
-- 6. Add feed_categories to user_preferences
-- =============================================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_preferences' AND column_name = 'feed_categories'
  ) THEN
    ALTER TABLE public.user_preferences
      ADD COLUMN feed_categories TEXT[] DEFAULT '{"recipe","place","event"}';
  END IF;
END $$;

-- =============================================================================
-- 7. Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts (category);
CREATE INDEX IF NOT EXISTS idx_posts_category_created_at ON public.posts (category, created_at DESC);
