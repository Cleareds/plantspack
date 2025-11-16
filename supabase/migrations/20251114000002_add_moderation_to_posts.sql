-- Add content moderation fields to posts table
-- This enables storing moderation results and content warnings

-- Add columns for content moderation
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS content_warnings TEXT[],
ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN DEFAULT FALSE;

-- Add index for faster queries on sensitive content
CREATE INDEX IF NOT EXISTS idx_posts_is_sensitive ON posts(is_sensitive) WHERE is_sensitive = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN posts.content_warnings IS 'Array of content warning categories from OpenAI moderation (e.g., violence, sexual content, etc.)';
COMMENT ON COLUMN posts.is_sensitive IS 'Flag indicating if content was flagged by moderation system';
