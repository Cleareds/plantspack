-- Prevent the OSM reimport duplicate problem at the DB layer.
--
-- Background: 13K+ duplicate places accumulated because earlier OSM imports
-- left source_id NULL or set it inconsistently across import runs, so later
-- runs that deduplicated on source_id didn't see them and re-inserted the
-- same OSM nodes under different slugs.
--
-- This migration runs in two steps inside a single transaction:
--
--   1. Atomic dedup: any remaining active rows that share the same source_id
--      get archived, keeping the row with the highest data score (reviews,
--      description, image, verification) and oldest created_at as tiebreaker.
--      The losers' slugs are added to place_slug_aliases so existing URLs
--      301-redirect to the winner.
--
--   2. Partial UNIQUE INDEX: makes a second insert with the same source_id
--      impossible at the database level, regardless of import-script behavior.
--      Archived rows are excluded so the dedup-archive script can keep its
--      history.

BEGIN;

-- Step 1: Archive remaining source_id duplicates atomically.
-- Use a window function to rank candidates within each source_id group; the
-- rank-1 winner stays live, ranks 2+ get archived.
WITH ranked AS (
  SELECT
    p.id,
    p.slug,
    p.source_id,
    p.review_count,
    ROW_NUMBER() OVER (
      PARTITION BY p.source_id
      ORDER BY
        COALESCE(p.review_count, 0) DESC,
        (CASE WHEN p.description IS NOT NULL AND length(p.description) > 20 THEN 1 ELSE 0 END) DESC,
        (CASE WHEN p.main_image_url IS NOT NULL THEN 1 ELSE 0 END) DESC,
        (CASE WHEN p.is_verified THEN 1 ELSE 0 END) DESC,
        p.created_at ASC
    ) AS rk,
    -- winner_id within the same partition (used for archived_reason + alias)
    FIRST_VALUE(p.id) OVER (
      PARTITION BY p.source_id
      ORDER BY
        COALESCE(p.review_count, 0) DESC,
        (CASE WHEN p.description IS NOT NULL AND length(p.description) > 20 THEN 1 ELSE 0 END) DESC,
        (CASE WHEN p.main_image_url IS NOT NULL THEN 1 ELSE 0 END) DESC,
        (CASE WHEN p.is_verified THEN 1 ELSE 0 END) DESC,
        p.created_at ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS winner_id
  FROM public.places p
  WHERE p.source_id IS NOT NULL AND p.archived_at IS NULL
),
losers AS (
  SELECT id, slug, winner_id
  FROM ranked
  WHERE rk > 1 AND COALESCE(review_count, 0) = 0  -- preserve any rows with reviews
),
archived_inserts AS (
  -- Add slug aliases for archived dupes (skip if alias already exists)
  INSERT INTO public.place_slug_aliases (old_slug, place_id)
  SELECT l.slug, l.winner_id
  FROM losers l
  WHERE l.slug IS NOT NULL
  ON CONFLICT (old_slug) DO NOTHING
  RETURNING old_slug
)
UPDATE public.places p
SET archived_at = now(),
    archived_reason = 'duplicate_source_id:' || l.winner_id::text
FROM losers l
WHERE p.id = l.id;

-- Step 2: Lock it in.
CREATE UNIQUE INDEX IF NOT EXISTS places_source_id_active_unique
  ON public.places (source_id)
  WHERE source_id IS NOT NULL AND archived_at IS NULL;

-- Helpful for the dedup-archive script and admin queries
CREATE INDEX IF NOT EXISTS places_archived_reason_idx
  ON public.places (archived_reason)
  WHERE archived_reason IS NOT NULL;

COMMIT;
