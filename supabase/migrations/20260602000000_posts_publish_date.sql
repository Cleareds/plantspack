-- Migration: stamp posts.created_at on draft -> public transition
-- Created: 2026-06-02
-- Why: the blog UI / OG / JSON-LD all use posts.created_at as the published
-- date. Posts that sit as drafts for days/weeks before going live would show
-- the draft-creation date instead of the publish moment. This trigger pulls
-- created_at forward to NOW() when a post first becomes public, so the date
-- the public web sees matches the date the post actually went out.

CREATE OR REPLACE FUNCTION public.posts_set_publish_date()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Transition from non-public to public: stamp created_at with NOW().
  -- Only fires if the value actually changes; subsequent edits while public
  -- do NOT re-bump the date.
  IF NEW.privacy = 'public' AND (OLD.privacy IS NULL OR OLD.privacy <> 'public') THEN
    NEW.created_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_posts_set_publish_date ON public.posts;
CREATE TRIGGER trg_posts_set_publish_date
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  WHEN (NEW.privacy IS DISTINCT FROM OLD.privacy)
  EXECUTE FUNCTION public.posts_set_publish_date();

COMMENT ON FUNCTION public.posts_set_publish_date IS
  'Stamps posts.created_at to NOW() when a post transitions from any non-public state to public, so the displayed published-date reflects the actual publish moment, not the draft-creation moment.';
