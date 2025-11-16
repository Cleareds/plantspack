-- Create hashtags system for posts
-- Supports #hashtag discovery and @mention notifications

-- Hashtags table to track all hashtags and their usage count
CREATE TABLE IF NOT EXISTS hashtags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag TEXT NOT NULL UNIQUE,
  normalized_tag TEXT NOT NULL UNIQUE, -- lowercase version for searching
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast hashtag lookup
CREATE INDEX IF NOT EXISTS idx_hashtags_normalized_tag ON hashtags(normalized_tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_usage_count ON hashtags(usage_count DESC);

-- Junction table for posts and hashtags (many-to-many)
CREATE TABLE IF NOT EXISTS post_hashtags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, hashtag_id)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_created_at ON post_hashtags(created_at DESC);

-- Add mentions column to posts table to store mentioned user IDs
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS mentioned_users UUID[];

-- Create index for mentions
CREATE INDEX IF NOT EXISTS idx_posts_mentioned_users ON posts USING GIN(mentioned_users);

-- Function to increment hashtag usage count
CREATE OR REPLACE FUNCTION increment_hashtag_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hashtags
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = NEW.hashtag_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment usage count when post_hashtag is created
DROP TRIGGER IF EXISTS increment_hashtag_usage_trigger ON post_hashtags;
CREATE TRIGGER increment_hashtag_usage_trigger
  AFTER INSERT ON post_hashtags
  FOR EACH ROW
  EXECUTE FUNCTION increment_hashtag_usage();

-- Function to decrement hashtag usage count
CREATE OR REPLACE FUNCTION decrement_hashtag_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hashtags
  SET usage_count = GREATEST(usage_count - 1, 0),
      updated_at = NOW()
  WHERE id = OLD.hashtag_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to decrement usage count when post_hashtag is deleted
DROP TRIGGER IF EXISTS decrement_hashtag_usage_trigger ON post_hashtags;
CREATE TRIGGER decrement_hashtag_usage_trigger
  AFTER DELETE ON post_hashtags
  FOR EACH ROW
  EXECUTE FUNCTION decrement_hashtag_usage();

-- RLS Policies for hashtags (public read, authenticated write)
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view hashtags" ON hashtags;
CREATE POLICY "Anyone can view hashtags" ON hashtags
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage hashtags" ON hashtags;
CREATE POLICY "Service role can manage hashtags" ON hashtags
  FOR ALL USING (true);

-- RLS Policies for post_hashtags (public read)
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view post hashtags" ON post_hashtags;
CREATE POLICY "Anyone can view post hashtags" ON post_hashtags
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage post hashtags" ON post_hashtags;
CREATE POLICY "Service role can manage post hashtags" ON post_hashtags
  FOR ALL USING (true);

-- Function to get posts by hashtag
CREATE OR REPLACE FUNCTION get_posts_by_hashtag(
  hashtag_text TEXT,
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  images TEXT[],
  video_urls TEXT[],
  privacy TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  like_count BIGINT,
  comment_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.content,
    p.images,
    p.video_urls,
    p.privacy,
    p.created_at,
    p.updated_at,
    COUNT(DISTINCT pl.id) AS like_count,
    COUNT(DISTINCT c.id) AS comment_count
  FROM posts p
  INNER JOIN post_hashtags ph ON p.id = ph.post_id
  INNER JOIN hashtags h ON ph.hashtag_id = h.id
  LEFT JOIN post_likes pl ON p.id = pl.post_id
  LEFT JOIN comments c ON p.id = c.post_id AND c.deleted_at IS NULL
  WHERE h.normalized_tag = LOWER(hashtag_text)
    AND p.deleted_at IS NULL
    AND p.privacy = 'public'
  GROUP BY p.id
  ORDER BY p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trending hashtags
CREATE OR REPLACE FUNCTION get_trending_hashtags(
  days_back INTEGER DEFAULT 7,
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  tag TEXT,
  usage_count INTEGER,
  recent_usage_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.tag,
    h.usage_count,
    COUNT(ph.id)::BIGINT AS recent_usage_count
  FROM hashtags h
  LEFT JOIN post_hashtags ph ON h.id = ph.hashtag_id
    AND ph.created_at > NOW() - (days_back || ' days')::INTERVAL
  GROUP BY h.id, h.tag, h.usage_count
  ORDER BY recent_usage_count DESC, h.usage_count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE hashtags IS 'Stores all unique hashtags used in posts';
COMMENT ON TABLE post_hashtags IS 'Junction table linking posts to hashtags';
COMMENT ON COLUMN posts.mentioned_users IS 'Array of user IDs mentioned in the post using @username';
COMMENT ON FUNCTION get_posts_by_hashtag IS 'Retrieves posts containing a specific hashtag';
COMMENT ON FUNCTION get_trending_hashtags IS 'Returns trending hashtags based on recent usage';
