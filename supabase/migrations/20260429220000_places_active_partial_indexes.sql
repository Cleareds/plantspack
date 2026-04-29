-- Partial composite indexes for the "archived_at IS NULL" hot path.
-- Effectively every directory / city-page / admin / score-recompute query
-- ANDs `is('archived_at', null)` with country/city/category/vegan_level.
-- Existing indexes are either non-partial (idx_places_city,
-- idx_places_country, idx_places_category) or filtered the wrong way
-- (idx_places_archived_at is `WHERE archived_at IS NOT NULL`, the inverse
-- of what hot reads want).
--
-- These partial indexes are smaller (only active rows) and let the planner
-- avoid a Filter step after the index scan. ~54K rows total, expected size
-- per index < 5MB.
--
-- NOTE: not using CREATE INDEX CONCURRENTLY because Supabase migrations
-- run inside a transaction. With 54K active rows the lock window is sub-
-- second; acceptable.

CREATE INDEX IF NOT EXISTS idx_places_active_country_city
  ON places (country, city)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_places_active_category
  ON places (category)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_places_active_vegan_level
  ON places (vegan_level)
  WHERE archived_at IS NULL;

-- For ORDER BY rating queries on city pages
CREATE INDEX IF NOT EXISTS idx_places_active_country_city_rating
  ON places (country, city, average_rating DESC NULLS LAST)
  WHERE archived_at IS NULL;

ANALYZE places;
