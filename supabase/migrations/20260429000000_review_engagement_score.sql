-- Mirror the posts.engagement_score setup for place_reviews so the unified
-- feed's `liked_week` / `liked_all_time` sorts can rank reviews server-side
-- the same way it ranks posts. Without this, reviews were loaded recent-only
-- and re-ranked in JS, so older popular reviews never surfaced.

ALTER TABLE public.place_reviews
  ADD COLUMN IF NOT EXISTS engagement_score REAL NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_place_reviews_engagement_score
  ON public.place_reviews (engagement_score DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_place_reviews_created_engagement
  ON public.place_reviews (created_at DESC, engagement_score DESC)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.calculate_review_engagement_score(review_uuid UUID)
RETURNS REAL AS $$
DECLARE
  reaction_count INTEGER := 0;
  hours_since_created REAL := 0;
  score REAL := 0;
BEGIN
  SELECT COUNT(*) INTO reaction_count
    FROM public.place_review_reactions
    WHERE review_id = review_uuid;

  SELECT EXTRACT(EPOCH FROM (now() - created_at)) / 3600
    INTO hours_since_created
    FROM public.place_reviews
    WHERE id = review_uuid;

  -- Reactions are the only signal on reviews today; weight them x3 like
  -- post likes and apply the same time-decay denominator the posts function
  -- uses, so the two streams sort comparably in the unified feed.
  score := (reaction_count * 3.0) / (1.0 + COALESCE(hours_since_created, 0) * 0.1);

  UPDATE public.place_reviews SET engagement_score = score WHERE id = review_uuid;
  RETURN score;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_review_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.calculate_review_engagement_score(
    COALESCE(NEW.review_id, OLD.review_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_review_engagement_on_reaction ON public.place_review_reactions;
CREATE TRIGGER update_review_engagement_on_reaction
  AFTER INSERT OR DELETE ON public.place_review_reactions
  FOR EACH ROW EXECUTE FUNCTION public.update_review_engagement_score();

GRANT EXECUTE ON FUNCTION public.calculate_review_engagement_score(UUID) TO authenticated, service_role;

-- Backfill existing rows.
UPDATE public.place_reviews pr SET engagement_score = (
  SELECT (COALESCE(COUNT(prr.id), 0) * 3.0)
       / (1.0 + (EXTRACT(EPOCH FROM (now() - pr.created_at)) / 3600) * 0.1)
  FROM public.place_review_reactions prr
  WHERE prr.review_id = pr.id
)
WHERE pr.deleted_at IS NULL;
