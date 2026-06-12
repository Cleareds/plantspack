-- User-submitted places from the mobile app ("Suggest a place").
-- Lightweight moderation queue: signed-in users insert their own submissions,
-- admins review them in /admin/data-quality (Mobile submissions tab).
-- Approval creates a row in `places` with is_verified=false and a source tag
-- (NEVER admin_review / is_verified=true — those are UI-only trust signals).

CREATE TABLE IF NOT EXISTS place_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Submitted fields (mirror the mobile form)
  name         TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'eat'
                 CHECK (category IN ('eat','hotel','event','store','organisation','other')),
  vegan_level  TEXT NOT NULL DEFAULT 'vegan_friendly'
                 CHECK (vegan_level IN ('fully_vegan','mostly_vegan','vegan_friendly','vegan_options')),
  address      TEXT,
  city         TEXT,
  country      TEXT,
  latitude     DOUBLE PRECISION,
  longitude    DOUBLE PRECISION,
  website      TEXT,
  notes        TEXT,

  -- Moderation
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected')),
  review_note  TEXT,
  reviewed_by  UUID REFERENCES users(id),
  reviewed_at  TIMESTAMPTZ,
  imported_place_id UUID REFERENCES places(id),

  source       TEXT NOT NULL DEFAULT 'mobile-suggest',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_submissions_status  ON place_submissions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_place_submissions_user    ON place_submissions (user_id, created_at DESC);

ALTER TABLE place_submissions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own submissions.
DROP POLICY IF EXISTS place_submissions_insert_own ON place_submissions;
CREATE POLICY place_submissions_insert_own ON place_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_banned = true)
  );

-- Users can read their own submissions; admins can read all.
DROP POLICY IF EXISTS place_submissions_select_own_or_admin ON place_submissions;
CREATE POLICY place_submissions_select_own_or_admin ON place_submissions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can update (review/approve/reject); service role bypasses RLS.
DROP POLICY IF EXISTS place_submissions_admin_update ON place_submissions;
CREATE POLICY place_submissions_admin_update ON place_submissions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
