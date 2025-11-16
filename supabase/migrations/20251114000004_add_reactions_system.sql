-- Add reactions system for posts and comments
-- Supports multiple reaction types: like, helpful, inspiring, thoughtful

-- First, rename existing post_likes table to post_reactions
-- We'll migrate existing likes to the new system

-- Create new post_reactions table
CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'helpful', 'inspiring', 'thoughtful')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON post_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_type ON post_reactions(reaction_type);
CREATE INDEX IF NOT EXISTS idx_post_reactions_created_at ON post_reactions(created_at DESC);

-- Migrate existing post_likes to post_reactions as 'like' type
INSERT INTO post_reactions (post_id, user_id, reaction_type, created_at)
SELECT post_id, user_id, 'like', created_at
FROM post_likes
ON CONFLICT (post_id, user_id, reaction_type) DO NOTHING;

-- Create comment_reactions table
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'helpful', 'inspiring', 'thoughtful')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Create indexes for comment reactions
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_type ON comment_reactions(reaction_type);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_created_at ON comment_reactions(created_at DESC);

-- RLS Policies for post_reactions
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view post reactions" ON post_reactions;
CREATE POLICY "Anyone can view post reactions" ON post_reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can add their own reactions" ON post_reactions;
CREATE POLICY "Users can add their own reactions" ON post_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own reactions" ON post_reactions;
CREATE POLICY "Users can remove their own reactions" ON post_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for comment_reactions
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comment reactions" ON comment_reactions;
CREATE POLICY "Anyone can view comment reactions" ON comment_reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can add their own comment reactions" ON comment_reactions;
CREATE POLICY "Users can add their own comment reactions" ON comment_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own comment reactions" ON comment_reactions;
CREATE POLICY "Users can remove their own comment reactions" ON comment_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Function to get reaction counts for a post
CREATE OR REPLACE FUNCTION get_post_reaction_counts(post_uuid UUID)
RETURNS TABLE (
  reaction_type TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.reaction_type,
    COUNT(*)::BIGINT
  FROM post_reactions pr
  WHERE pr.post_id = post_uuid
  GROUP BY pr.reaction_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get reaction counts for a comment
CREATE OR REPLACE FUNCTION get_comment_reaction_counts(comment_uuid UUID)
RETURNS TABLE (
  reaction_type TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cr.reaction_type,
    COUNT(*)::BIGINT
  FROM comment_reactions cr
  WHERE cr.comment_id = comment_uuid
  GROUP BY cr.reaction_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle post reaction
CREATE OR REPLACE FUNCTION toggle_post_reaction(
  post_uuid UUID,
  reaction TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_uuid UUID;
  reaction_exists BOOLEAN;
BEGIN
  -- Get current user
  user_uuid := auth.uid();

  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if reaction exists
  SELECT EXISTS(
    SELECT 1 FROM post_reactions
    WHERE post_id = post_uuid
      AND user_id = user_uuid
      AND reaction_type = reaction
  ) INTO reaction_exists;

  IF reaction_exists THEN
    -- Remove reaction
    DELETE FROM post_reactions
    WHERE post_id = post_uuid
      AND user_id = user_uuid
      AND reaction_type = reaction;
    RETURN FALSE;
  ELSE
    -- Add reaction
    INSERT INTO post_reactions (post_id, user_id, reaction_type)
    VALUES (post_uuid, user_uuid, reaction);
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to toggle comment reaction
CREATE OR REPLACE FUNCTION toggle_comment_reaction(
  comment_uuid UUID,
  reaction TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_uuid UUID;
  reaction_exists BOOLEAN;
BEGIN
  -- Get current user
  user_uuid := auth.uid();

  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if reaction exists
  SELECT EXISTS(
    SELECT 1 FROM comment_reactions
    WHERE comment_id = comment_uuid
      AND user_id = user_uuid
      AND reaction_type = reaction
  ) INTO reaction_exists;

  IF reaction_exists THEN
    -- Remove reaction
    DELETE FROM comment_reactions
    WHERE comment_id = comment_uuid
      AND user_id = user_uuid
      AND reaction_type = reaction;
    RETURN FALSE;
  ELSE
    -- Add reaction
    INSERT INTO comment_reactions (comment_id, user_id, reaction_type)
    VALUES (comment_uuid, user_uuid, reaction);
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE post_reactions IS 'Stores user reactions to posts (like, helpful, inspiring, thoughtful)';
COMMENT ON TABLE comment_reactions IS 'Stores user reactions to comments (like, helpful, inspiring, thoughtful)';
COMMENT ON FUNCTION toggle_post_reaction IS 'Toggle a reaction on a post (add if not exists, remove if exists)';
COMMENT ON FUNCTION toggle_comment_reaction IS 'Toggle a reaction on a comment (add if not exists, remove if exists)';
COMMENT ON FUNCTION get_post_reaction_counts IS 'Get counts of each reaction type for a post';
COMMENT ON FUNCTION get_comment_reaction_counts IS 'Get counts of each reaction type for a comment';

-- Note: We keep post_likes table for backward compatibility
-- New features should use post_reactions table
-- You can optionally drop post_likes after confirming migration worked:
-- DROP TABLE post_likes CASCADE;
