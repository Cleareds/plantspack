-- Migration: Add index for comment pagination
-- Purpose: Optimize comment queries with pagination
-- Date: 2025-11-11

-- Create composite index for efficient comment queries
-- This index optimizes queries that filter by post_id and order by created_at
CREATE INDEX IF NOT EXISTS idx_comments_post_id_created_at
  ON comments(post_id, created_at DESC);

-- Add comment on the index for documentation
COMMENT ON INDEX idx_comments_post_id_created_at IS
  'Composite index for efficient comment pagination queries by post_id and created_at';
