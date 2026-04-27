-- Community readiness: rate limits + trust score + auto-approval threshold.
--
-- Why: AddPlaceModal inserts directly into places via the Supabase client
-- using user-scoped RLS. With ~30K archived URL spam vectors and a public
-- write surface, we need basic abuse defenses before opening to organic
-- community traffic. Approach:
--   1. trust_score column on users (admin curators bump it on approvals)
--   2. RLS policy enforces a per-user 24h submission cap, scaled by trust
--   3. Admins are exempt; banned users blocked entirely
--   4. Rejected submissions decrement trust to disincentivize spam

-- 1. Trust score column
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS users_trust_score_idx ON public.users (trust_score) WHERE trust_score > 0;

COMMENT ON COLUMN public.users.trust_score IS
  'Curation trust: +1 per approved community submission, -1 per rejection. >=5 unlocks higher submission caps and auto-approval candidacy.';

-- 2. Helper: count user submissions in last 24h (excludes admin imports)
CREATE OR REPLACE FUNCTION public.places_submitted_by_user_24h(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.places
  WHERE created_by = p_user_id
    AND created_at > now() - interval '24 hours';
$$;

-- 3. Enforce the rate limit via RLS. Admins/system bypass; banned users blocked.
DROP POLICY IF EXISTS "Authenticated users can insert places" ON public.places;
DROP POLICY IF EXISTS "Authenticated users can submit places" ON public.places;

CREATE POLICY "Authenticated users can submit places (rate-limited)"
ON public.places
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admins bypass everything
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  OR (
    -- Non-admins: must not be banned, must own the row, must be under cap
    auth.uid() = created_by
    AND NOT EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND is_banned = true
    )
    AND public.places_submitted_by_user_24h(auth.uid()) < (
      SELECT CASE
        WHEN trust_score >= 5 THEN 20
        ELSE 5
      END
      FROM public.users WHERE id = auth.uid()
    )
  )
);

-- 4. Auto-tune trust on staging approval/rejection.
-- Triggered by admin actions on place_staging — when a community-added place
-- gets approved we bump the submitter's trust; rejection drops it.
CREATE OR REPLACE FUNCTION public.adjust_trust_on_staging_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submitter uuid;
BEGIN
  -- Only act on transitions to terminal states
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  v_submitter := NEW.submitted_by;
  IF v_submitter IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('approved', 'approved_fully_vegan', 'approved_mostly_vegan', 'approved_vegan_options') THEN
    UPDATE public.users SET trust_score = trust_score + 1 WHERE id = v_submitter;
  ELSIF NEW.status = 'rejected' THEN
    UPDATE public.users SET trust_score = GREATEST(trust_score - 1, -10) WHERE id = v_submitter;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach only if place_staging exists with a `submitted_by` column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'place_staging' AND column_name = 'submitted_by'
  ) THEN
    DROP TRIGGER IF EXISTS adjust_trust_on_staging_decision_trg ON public.place_staging;
    CREATE TRIGGER adjust_trust_on_staging_decision_trg
      AFTER UPDATE ON public.place_staging
      FOR EACH ROW EXECUTE FUNCTION public.adjust_trust_on_staging_decision();
  END IF;
END $$;

-- 5. Extend the existing reports table to support reporting places (not just
-- place_reviews/posts/comments/users). The earlier migration removed 'place'
-- from the allowed types when adding 'place_review'; we restore it so the
-- ReportButton can flag a listing for closure / wrong info / spam etc.
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reported_type_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_reported_type_check
  CHECK (reported_type IN ('post', 'comment', 'user', 'place', 'place_review'));
