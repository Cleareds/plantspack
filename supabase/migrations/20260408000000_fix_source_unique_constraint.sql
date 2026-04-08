-- Replace partial unique index with a proper unique constraint for upsert support
-- The partial index (WHERE source IS NOT NULL AND source_id IS NOT NULL) doesn't work with ON CONFLICT

DROP INDEX IF EXISTS idx_places_source_id_unique;
DROP INDEX IF EXISTS idx_places_source;

-- Create a proper unique constraint (not partial) that works with upsert
ALTER TABLE places ADD CONSTRAINT places_source_source_id_unique UNIQUE (source, source_id);
