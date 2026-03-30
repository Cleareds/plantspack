-- Add pinned post support (only 1 pinned post at a time, admin only)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Ensure only one post can be pinned at a time via a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_single_pinned ON posts (is_pinned) WHERE is_pinned = true;
