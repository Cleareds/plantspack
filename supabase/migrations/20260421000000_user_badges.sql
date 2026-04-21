-- Profile contributions + contributor badges
-- - user_badges table for achievement-style chips shown next to usernames
-- - user_contributions_summary view for profile stats + contributions page
-- - triggers to auto-award badges as users contribute
-- - backfill for existing contributors (keeps the 'first 100 early_contributor' cap)

----------------------------------------------------------------------
-- 1. user_badges table
----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_code  TEXT NOT NULL,
  awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- One badge per (user, code, optional city). Use COALESCE so NULL/missing
-- city collapses to '' and the uniqueness is well-defined.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_badges_unique
  ON public.user_badges (user_id, badge_code, (COALESCE(metadata->>'city', '')));

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges (user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_code ON public.user_badges (badge_code);

-- RLS: anyone can read, only service-role can write. Badges are system-granted.
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_badges_read" ON public.user_badges;
CREATE POLICY "user_badges_read" ON public.user_badges
  FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies — only service-role (bypasses RLS) can mutate.

----------------------------------------------------------------------
-- 2. user_contributions_summary view
----------------------------------------------------------------------

CREATE OR REPLACE VIEW public.user_contributions_summary AS
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
    WHERE user_id = u.id), 0)::int AS corrections_submitted
FROM public.users u;

GRANT SELECT ON public.user_contributions_summary TO anon, authenticated;

----------------------------------------------------------------------
-- 3. RPC for contributions summary + badges in one call
----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_contributions_summary(user_uuid UUID)
RETURNS TABLE (
  places_added           INT,
  reviews_written        INT,
  recipe_reviews_written INT,
  posts_published        INT,
  packs_created          INT,
  corrections_submitted  INT,
  badge_codes            TEXT[]
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
    COALESCE(ARRAY(SELECT DISTINCT badge_code FROM public.user_badges WHERE user_id = user_uuid ORDER BY badge_code), ARRAY[]::TEXT[])
  FROM public.user_contributions_summary s
  WHERE s.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_contributions_summary(UUID) TO anon, authenticated;

----------------------------------------------------------------------
-- 4. Badge award trigger functions
----------------------------------------------------------------------

-- Reviewer: 5+ non-deleted reviews across place_reviews + recipe_reviews.
CREATE OR REPLACE FUNCTION public.maybe_award_reviewer() RETURNS TRIGGER AS $$
DECLARE
  total INT;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM public.place_reviews WHERE user_id = NEW.user_id AND deleted_at IS NULL)
    + (SELECT COUNT(*) FROM public.recipe_reviews WHERE user_id = NEW.user_id AND deleted_at IS NULL)
    INTO total;
  IF total >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_code)
    VALUES (NEW.user_id, 'reviewer')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Curator: 3+ active places added (archived_at IS NULL).
CREATE OR REPLACE FUNCTION public.maybe_award_curator() RETURNS TRIGGER AS $$
DECLARE
  total INT;
  uid UUID := NEW.created_by;
BEGIN
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) INTO total
    FROM public.places
    WHERE created_by = uid AND archived_at IS NULL;
  IF total >= 3 THEN
    INSERT INTO public.user_badges (user_id, badge_code)
    VALUES (uid, 'curator')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Early contributor: awarded on the first contribution, capped at 100 holders.
-- Awards to the row's user (NEW.user_id on reviews/posts, NEW.created_by on places).
CREATE OR REPLACE FUNCTION public.maybe_award_early() RETURNS TRIGGER AS $$
DECLARE
  uid UUID;
  current INT;
BEGIN
  uid := COALESCE(NEW.user_id, NEW.created_by);
  IF uid IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO current FROM public.user_badges WHERE badge_code = 'early_contributor';
  IF current < 100 THEN
    INSERT INTO public.user_badges (user_id, badge_code)
    VALUES (uid, 'early_contributor')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Separate helper for places (uses created_by rather than user_id).
CREATE OR REPLACE FUNCTION public.maybe_award_early_place() RETURNS TRIGGER AS $$
DECLARE
  current INT;
BEGIN
  IF NEW.created_by IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO current FROM public.user_badges WHERE badge_code = 'early_contributor';
  IF current < 100 THEN
    INSERT INTO public.user_badges (user_id, badge_code)
    VALUES (NEW.created_by, 'early_contributor')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

----------------------------------------------------------------------
-- 5. Attach triggers
----------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_award_reviewer_place    ON public.place_reviews;
CREATE TRIGGER trg_award_reviewer_place
  AFTER INSERT ON public.place_reviews
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_reviewer();

DROP TRIGGER IF EXISTS trg_award_reviewer_recipe   ON public.recipe_reviews;
CREATE TRIGGER trg_award_reviewer_recipe
  AFTER INSERT ON public.recipe_reviews
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_reviewer();

DROP TRIGGER IF EXISTS trg_award_curator           ON public.places;
CREATE TRIGGER trg_award_curator
  AFTER INSERT ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_curator();

DROP TRIGGER IF EXISTS trg_award_early_place       ON public.places;
CREATE TRIGGER trg_award_early_place
  AFTER INSERT ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_early_place();

DROP TRIGGER IF EXISTS trg_award_early_place_rev   ON public.place_reviews;
CREATE TRIGGER trg_award_early_place_rev
  AFTER INSERT ON public.place_reviews
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_early();

DROP TRIGGER IF EXISTS trg_award_early_recipe_rev  ON public.recipe_reviews;
CREATE TRIGGER trg_award_early_recipe_rev
  AFTER INSERT ON public.recipe_reviews
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_early();

DROP TRIGGER IF EXISTS trg_award_early_post        ON public.posts;
CREATE TRIGGER trg_award_early_post
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.maybe_award_early();

----------------------------------------------------------------------
-- 6. Backfill existing contributors
----------------------------------------------------------------------

-- Early contributor: everyone who has at least one contribution, up to first 100.
INSERT INTO public.user_badges (user_id, badge_code, awarded_at)
SELECT DISTINCT ON (user_id) user_id, 'early_contributor', first_ts
FROM (
  SELECT created_by AS user_id, created_at AS first_ts
    FROM public.places WHERE archived_at IS NULL AND created_by IS NOT NULL
  UNION ALL
  SELECT user_id, created_at
    FROM public.place_reviews WHERE deleted_at IS NULL
  UNION ALL
  SELECT user_id, created_at
    FROM public.recipe_reviews WHERE deleted_at IS NULL
  UNION ALL
  SELECT user_id, created_at
    FROM public.posts
    WHERE deleted_at IS NULL AND category NOT IN ('recipe','event')
) all_contribs
ORDER BY user_id, first_ts ASC
LIMIT 100
ON CONFLICT DO NOTHING;

-- Reviewer: users with 5+ total reviews (place + recipe combined).
INSERT INTO public.user_badges (user_id, badge_code)
SELECT user_id, 'reviewer'
FROM (
  SELECT user_id, COUNT(*) AS cnt FROM (
    SELECT user_id FROM public.place_reviews WHERE deleted_at IS NULL
    UNION ALL
    SELECT user_id FROM public.recipe_reviews WHERE deleted_at IS NULL
  ) r
  GROUP BY user_id
) agg
WHERE cnt >= 5
ON CONFLICT DO NOTHING;

-- Curator: users with 3+ active places added.
INSERT INTO public.user_badges (user_id, badge_code)
SELECT created_by, 'curator'
FROM public.places
WHERE archived_at IS NULL AND created_by IS NOT NULL
GROUP BY created_by
HAVING COUNT(*) >= 3
ON CONFLICT DO NOTHING;

----------------------------------------------------------------------
-- 7. Documentation
----------------------------------------------------------------------

COMMENT ON TABLE public.user_badges IS
  'System-granted contributor badges (early_contributor / reviewer / curator / future local_hero). System-only writes, public reads.';
COMMENT ON VIEW public.user_contributions_summary IS
  'Per-user contribution counts (places / reviews / posts / packs / corrections). Used by My Contributions page and profile stats.';
COMMENT ON FUNCTION public.get_user_contributions_summary(UUID) IS
  'One-call fetch of contribution counts + badge codes for a given user.';
