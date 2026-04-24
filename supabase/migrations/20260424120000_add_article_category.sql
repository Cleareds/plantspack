-- Add 'article' to posts category constraint to support blog articles
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_category_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_category_check
  CHECK (category IN ('recipe','place','event','lifestyle','activism','question','product','general','hotel','organisation','article'));

-- Insert 'article' into categories reference table
INSERT INTO public.categories (slug, display_name, description, icon_name, display_order, is_active, color)
VALUES ('article', 'Article', 'Long-form blog articles and essays', 'article', 9, true, '#0a6a1d')
ON CONFLICT (slug) DO NOTHING;
