-- Forest: trees that have fully matured. When a user's current tree reaches
-- the final TREE_STAGES threshold (10,000 Sprouts seeded), it graduates to
-- a row in `user_forest_trees`, the user_trees row is reset, and the user
-- can begin growing a new tree from an empty pot.

CREATE TABLE IF NOT EXISTS user_forest_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sprouts_seeded INTEGER NOT NULL,
  species TEXT,                                  -- 'oak', 'maple', 'cherry' - reserved for future variety
  display_order INTEGER NOT NULL DEFAULT 0,
  dedication TEXT,                               -- optional user-supplied message
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forest_user ON user_forest_trees(user_id, matured_at DESC);

ALTER TABLE user_forest_trees ENABLE ROW LEVEL SECURITY;

CREATE POLICY forest_read_public ON user_forest_trees
  FOR SELECT USING (true);

CREATE POLICY forest_write_admin ON user_forest_trees
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Cached count on users for quick lookup in leaderboards and the sidebar.
ALTER TABLE users ADD COLUMN IF NOT EXISTS forest_size INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_users_forest_size ON users(forest_size DESC);
