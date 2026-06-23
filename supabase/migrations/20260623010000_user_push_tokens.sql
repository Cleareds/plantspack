-- Expo push tokens for mobile devices. The mobile app upserts its token here on
-- launch; the backend (createNotification) reads them to deliver push when a
-- notification row is created. One row per device token.
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text CHECK (platform IN ('ios','android','web')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user ON user_push_tokens(user_id);

ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users manage only their own device tokens. The service role (backend sender)
-- bypasses RLS.
DROP POLICY IF EXISTS "own push tokens select" ON user_push_tokens;
CREATE POLICY "own push tokens select" ON user_push_tokens FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own push tokens insert" ON user_push_tokens;
CREATE POLICY "own push tokens insert" ON user_push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own push tokens update" ON user_push_tokens;
CREATE POLICY "own push tokens update" ON user_push_tokens FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own push tokens delete" ON user_push_tokens;
CREATE POLICY "own push tokens delete" ON user_push_tokens FOR DELETE USING (auth.uid() = user_id);
