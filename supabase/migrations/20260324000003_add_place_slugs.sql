-- Enable unaccent extension for slug generation
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add slug column to places for SEO-friendly URLs
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate slugs for all existing places
-- Format: name-city or name-country (lowercased, special chars removed)
UPDATE places SET slug = (
  SELECT DISTINCT ON (candidate)
    candidate
  FROM (
    SELECT
      regexp_replace(
        lower(
          unaccent(
            name || COALESCE('-' || city, '') || COALESCE('-' || country, '')
          )
        ),
        '[^a-z0-9]+', '-', 'g'
      ) AS candidate
  ) sub
)
WHERE slug IS NULL;

-- Clean up double hyphens and trailing hyphens
UPDATE places SET slug = regexp_replace(regexp_replace(slug, '-+', '-', 'g'), '^-|-$', '', 'g')
WHERE slug IS NOT NULL;

-- Handle duplicates by appending a number
DO $$
DECLARE
  dup RECORD;
  counter INT;
BEGIN
  FOR dup IN
    SELECT slug, array_agg(id ORDER BY created_at) as ids
    FROM places
    WHERE slug IS NOT NULL
    GROUP BY slug
    HAVING count(*) > 1
  LOOP
    counter := 1;
    FOR i IN 2..array_length(dup.ids, 1) LOOP
      UPDATE places SET slug = dup.slug || '-' || counter
      WHERE id = dup.ids[i];
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_places_slug ON places (slug) WHERE slug IS NOT NULL;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_places_slug_lookup ON places (slug) WHERE slug IS NOT NULL;
