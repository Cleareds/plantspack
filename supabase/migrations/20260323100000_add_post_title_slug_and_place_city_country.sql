-- 1. Add title and slug columns to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug (only for non-null slugs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug ON posts (slug) WHERE slug IS NOT NULL;

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_posts_slug_lookup ON posts (slug) WHERE slug IS NOT NULL;

-- Function to generate a URL-safe slug from a title
CREATE OR REPLACE FUNCTION generate_post_slug(post_title TEXT, post_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  slug_exists BOOLEAN;
  counter INTEGER := 1;
BEGIN
  IF post_title IS NULL OR trim(post_title) = '' THEN
    RETURN NULL;
  END IF;

  -- Convert to lowercase, replace non-alphanumeric with hyphens, collapse multiple hyphens
  base_slug := lower(trim(post_title));
  base_slug := regexp_replace(base_slug, '[^a-z0-9\-]', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  -- Truncate to reasonable length
  IF length(base_slug) > 80 THEN
    base_slug := left(base_slug, 80);
    base_slug := trim(both '-' from base_slug);
  END IF;

  -- If slug is empty after sanitization, return null
  IF base_slug = '' THEN
    RETURN NULL;
  END IF;

  -- Check uniqueness
  final_slug := base_slug;
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM posts WHERE slug = final_slug AND id != post_id
    ) INTO slug_exists;

    EXIT WHEN NOT slug_exists;

    final_slug := base_slug || '-' || counter;
    counter := counter + 1;

    IF counter > 100 THEN
      -- Fallback: append part of UUID
      final_slug := base_slug || '-' || left(post_id::text, 8);
      EXIT;
    END IF;
  END LOOP;

  RETURN final_slug;
END;
$$;

-- Trigger to auto-generate slug on insert/update when title is provided
CREATE OR REPLACE FUNCTION handle_post_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate slug when title is set/changed and slug isn't manually provided
  IF NEW.title IS NOT NULL AND trim(NEW.title) != '' THEN
    IF NEW.slug IS NULL OR (TG_OP = 'UPDATE' AND OLD.title IS DISTINCT FROM NEW.title) THEN
      NEW.slug := generate_post_slug(NEW.title, NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS post_slug_trigger ON posts;
CREATE TRIGGER post_slug_trigger
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION handle_post_slug();

-- 2. Add city and country columns to places
ALTER TABLE places ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE places ADD COLUMN IF NOT EXISTS country TEXT;

CREATE INDEX IF NOT EXISTS idx_places_city ON places (city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_places_country ON places (country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_places_city_country ON places (city, country) WHERE city IS NOT NULL;
