-- Tool scan log: every ingredient/menu scan, used for quota + cost tracking + image-hash cache.
-- Guests are identified by a random cookie id (`guest_id`); signed-in users by `user_id`.
-- `image_hash` lets us serve cached verdicts for identical re-uploads at zero cost.

CREATE TABLE IF NOT EXISTS tool_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_id text,
  ip_hash text,
  tool text NOT NULL CHECK (tool IN ('ingredient', 'menu')),
  cost_usd numeric(10, 6) NOT NULL DEFAULT 0,
  image_hash text,
  verdict text,
  result jsonb,
  rejected boolean NOT NULL DEFAULT false,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tool_scans_user_tool_idx
  ON tool_scans (user_id, tool, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tool_scans_guest_tool_idx
  ON tool_scans (guest_id, tool, created_at DESC)
  WHERE guest_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tool_scans_image_hash_idx
  ON tool_scans (image_hash, tool)
  WHERE image_hash IS NOT NULL AND rejected = false;

CREATE INDEX IF NOT EXISTS tool_scans_created_at_idx
  ON tool_scans (created_at DESC);

ALTER TABLE tool_scans ENABLE ROW LEVEL SECURITY;

-- Users can read their own scan history; admins can read all via service role.
CREATE POLICY tool_scans_self_select ON tool_scans
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
