-- Vegan Experience Rating + Survival Tips
-- Per-city narrative + rating + up-to-5 tips, separate from per-place reviews.
-- Reuses the review pattern: soft-delete, edit_count, upsert-on-POST.

----------------------------------------------------------------------
-- 1. Table
----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.city_experiences (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  city               TEXT NOT NULL,
  country            TEXT NOT NULL,
  city_slug          TEXT NOT NULL,
  country_slug       TEXT NOT NULL,
  -- ratings (1..5)
  overall_rating       SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  eating_out_rating    SMALLINT CHECK (eating_out_rating BETWEEN 1 AND 5),
  grocery_rating       SMALLINT CHECK (grocery_rating BETWEEN 1 AND 5),
  -- narrative
  summary            TEXT NOT NULL CHECK (char_length(summary) BETWEEN 30 AND 1200),
  tips               TEXT[] DEFAULT ARRAY[]::TEXT[],
  best_neighborhoods TEXT,
  visited_period     TEXT,
  -- meta
  images             TEXT[] DEFAULT ARRAY[]::TEXT[],
  edited_at          TIMESTAMPTZ,
  edit_count         INT DEFAULT 0,
  deleted_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tips_max_5 CHECK (cardinality(tips) <= 5)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_city_experiences_uniq
  ON public.city_experiences (user_id, city_slug, country_slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_city_experiences_city
  ON public.city_experiences (city_slug, country_slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_city_experiences_user
  ON public.city_experiences (user_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.city_experiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "city_exp_read"   ON public.city_experiences;
DROP POLICY IF EXISTS "city_exp_insert" ON public.city_experiences;
DROP POLICY IF EXISTS "city_exp_update" ON public.city_experiences;

CREATE POLICY "city_exp_read" ON public.city_experiences
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "city_exp_insert" ON public.city_experiences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "city_exp_update" ON public.city_experiences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- No DELETE policy: soft-delete via UPDATE only.

----------------------------------------------------------------------
-- 2. Aggregate summary view
----------------------------------------------------------------------

CREATE OR REPLACE VIEW public.city_experiences_summary AS
SELECT
  city_slug,
  country_slug,
  MIN(city)    AS city,     -- first canonical name
  MIN(country) AS country,
  COUNT(*)::int                                 AS experience_count,
  ROUND(AVG(overall_rating)::numeric, 1)::float AS avg_overall_rating,
  ROUND(AVG(eating_out_rating)::numeric, 1)::float AS avg_eating_out_rating,
  ROUND(AVG(grocery_rating)::numeric, 1)::float AS avg_grocery_rating
FROM public.city_experiences
WHERE deleted_at IS NULL
GROUP BY city_slug, country_slug;

GRANT SELECT ON public.city_experiences_summary TO anon, authenticated;

----------------------------------------------------------------------
-- 3. Extend user_contributions_summary view and RPC
----------------------------------------------------------------------

DROP VIEW IF EXISTS public.user_contributions_summary;
CREATE VIEW public.user_contributions_summary AS
SELECT
  u.id AS user_id,
  COALESCE((SELECT COUNT(*) FROM public.places
    WHERE created_by = u.id AND archived_at IS NULL), 0)::int AS places_added,
  COALESCE((SELECT COUNT(*) FROM public.place_reviews
    WHERE user_id = u.id AND deleted_at IS NULL), 0)::int AS reviews_written,
  COALESCE((SELECT COUNT(*) FROM public.recipe_reviews
    WHERE user_id = u.id AND deleted_at IS NULL), 0)::int AS recipe_reviews_written,
  COALESCE((SELECT COUNT(*) FROM public.posts
    WHERE user_id = u.id AND deleted_at IS NULL
      AND category NOT IN ('recipe', 'event')), 0)::int AS posts_published,
  COALESCE((SELECT COUNT(*) FROM public.packs
    WHERE creator_id = u.id), 0)::int AS packs_created,
  COALESCE((SELECT COUNT(*) FROM public.place_corrections
    WHERE user_id = u.id), 0)::int AS corrections_submitted,
  COALESCE((SELECT COUNT(*) FROM public.city_experiences
    WHERE user_id = u.id AND deleted_at IS NULL), 0)::int AS city_experiences_written
FROM public.users u;

GRANT SELECT ON public.user_contributions_summary TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_user_contributions_summary(UUID);
CREATE FUNCTION public.get_user_contributions_summary(user_uuid UUID)
RETURNS TABLE (
  places_added             INT,
  reviews_written          INT,
  recipe_reviews_written   INT,
  posts_published          INT,
  packs_created            INT,
  corrections_submitted    INT,
  city_experiences_written INT,
  badge_codes              TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.places_added,
    s.reviews_written,
    s.recipe_reviews_written,
    s.posts_published,
    s.packs_created,
    s.corrections_submitted,
    s.city_experiences_written,
    COALESCE(ARRAY(
      SELECT DISTINCT badge_code FROM public.user_badges
      WHERE user_id = user_uuid ORDER BY badge_code
    ), ARRAY[]::TEXT[])
  FROM public.user_contributions_summary s
  WHERE s.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_contributions_summary(UUID) TO anon, authenticated;

----------------------------------------------------------------------
-- 4. Explorer badge (3+ city experiences) + early_contributor trigger
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.maybe_award_explorer() RETURNS TRIGGER AS $$
DECLARE
  total INT;
BEGIN
  SELECT COUNT(*) INTO total FROM public.city_experiences
    WHERE user_id = NEW.user_id AND deleted_at IS NULL;
  IF total >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_code)
    VALUES (NEW.user_id, 'explorer')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_award_explorer ON public.city_experiences;
CREATE TRIGGER trg_award_explorer
  AFTER INSERT ON public.city_experiences
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_explorer();

-- Also attach the existing early_contributor trigger to this new table so
-- sharing a city experience qualifies a user for the Early badge.
DROP TRIGGER IF EXISTS trg_award_early_city_exp ON public.city_experiences;
CREATE TRIGGER trg_award_early_city_exp
  AFTER INSERT ON public.city_experiences
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_early();

COMMENT ON TABLE public.city_experiences IS
  'Per-city vegan experience write-ups (overall/eating-out/grocery ratings + narrative + up to 5 tips). Upserted by (user, city_slug, country_slug).';
COMMENT ON VIEW public.city_experiences_summary IS
  'Aggregate per-city experience stats (count + avg ratings) for displaying on city directory pages.';
