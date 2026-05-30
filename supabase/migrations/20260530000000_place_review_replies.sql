-- Migration: Place Review Replies
-- Created: 2026-05-30
-- Description: Lets verified place owners and admins post a reply to each
--              review on their place. At most ONE owner reply and ONE admin
--              reply per review (unique constraint on review_id + author_role).
--              Same soft-delete / edit-tracking shape as place_reviews.

-- ============================================================================
-- Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.place_review_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.place_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 'owner' or 'admin' — drives the badge in the UI and the RLS check on insert.
  -- Server resolves this from place_owners / users.role and validates that the
  -- claimed role actually applies to the acting user.
  author_role TEXT NOT NULL CHECK (author_role IN ('owner', 'admin')),

  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),

  -- Same soft-delete / edit-tracking shape as place_reviews
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  edited_at TIMESTAMPTZ DEFAULT NULL,
  edit_count INTEGER DEFAULT 0 CHECK (edit_count >= 0),

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- At most one reply per review per role. Means an owner can edit their
  -- single reply but not stack multiple, same for admins.
  CONSTRAINT place_review_replies_unique_role_per_review
    UNIQUE (review_id, author_role)
);

CREATE INDEX IF NOT EXISTS idx_place_review_replies_review_id
  ON public.place_review_replies(review_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_place_review_replies_user_id
  ON public.place_review_replies(user_id);

CREATE INDEX IF NOT EXISTS idx_place_review_replies_created_at
  ON public.place_review_replies(created_at DESC);

COMMENT ON TABLE public.place_review_replies IS
  'Owner / admin replies to place_reviews. One owner reply + one admin reply per review max.';

-- ============================================================================
-- updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.touch_place_review_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_place_review_replies_updated_at ON public.place_review_replies;
CREATE TRIGGER trg_place_review_replies_updated_at
  BEFORE UPDATE ON public.place_review_replies
  FOR EACH ROW EXECUTE FUNCTION public.touch_place_review_replies_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.place_review_replies ENABLE ROW LEVEL SECURITY;

-- Public read for non-deleted replies. Public pages render these; no PII risk.
DROP POLICY IF EXISTS "Public can read non-deleted replies" ON public.place_review_replies;
CREATE POLICY "Public can read non-deleted replies"
  ON public.place_review_replies
  FOR SELECT
  USING (deleted_at IS NULL);

-- Insert: must be authenticated AND the claimed role actually applies.
--   owner: user has a place_owners row for the place backing this review
--   admin: users.role = 'admin'
-- The unique (review_id, author_role) constraint prevents stacking.
DROP POLICY IF EXISTS "Owners and admins can reply" ON public.place_review_replies;
CREATE POLICY "Owners and admins can reply"
  ON public.place_review_replies
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (
        author_role = 'owner'
        AND EXISTS (
          SELECT 1
          FROM public.place_owners po
          JOIN public.place_reviews pr ON pr.place_id = po.place_id
          WHERE pr.id = place_review_replies.review_id
            AND po.user_id = auth.uid()
        )
      )
      OR (
        author_role = 'admin'
        AND EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
      )
    )
  );

-- Update: only the original author. Server-side route enforces field whitelist.
DROP POLICY IF EXISTS "Authors can update own reply" ON public.place_review_replies;
CREATE POLICY "Authors can update own reply"
  ON public.place_review_replies
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No hard delete from clients — soft delete via UPDATE deleted_at.
-- (Service-role bypasses RLS for admin moderation if ever needed.)

GRANT SELECT ON public.place_review_replies TO anon, authenticated;
GRANT INSERT, UPDATE ON public.place_review_replies TO authenticated;
