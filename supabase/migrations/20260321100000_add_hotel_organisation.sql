-- Add new post categories
INSERT INTO public.categories (slug, display_name, description, icon_name, display_order, is_active, color)
VALUES
  ('hotel', 'Hotels', 'Vegan-friendly accommodations', 'hotel', 9, true, '#5c6bc0'),
  ('organisation', 'Organisations', 'Vegan brands, companies, and organisations', 'corporate_fare', 10, true, '#26a69a')
ON CONFLICT (slug) DO NOTHING;

-- Update posts category CHECK constraint to include new values
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_category_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_category_check
  CHECK (category IN ('recipe','place','event','lifestyle','activism','question','product','general','hotel','organisation'));

-- Update places categories: merge restaurant+cafe → eat, add hotel+organisation
ALTER TABLE public.places DROP CONSTRAINT IF EXISTS places_category_check;
UPDATE public.places SET category = 'eat' WHERE category IN ('restaurant', 'cafe');
ALTER TABLE public.places ADD CONSTRAINT places_category_check
  CHECK (category IN ('eat', 'hotel', 'event', 'museum', 'organisation', 'other'));

-- Add trigram index for place name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_places_name_trgm ON public.places USING GIN (name gin_trgm_ops);
