-- Add unique constraint on (source, source_id) for upsert support during imports
-- This enables ON CONFLICT (source, source_id) for deduplication

-- Drop old non-unique index if it exists
DROP INDEX IF EXISTS idx_places_source;

-- Create unique partial index (only where both fields are non-null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_places_source_id_unique
  ON places (source, source_id)
  WHERE source IS NOT NULL AND source_id IS NOT NULL;
