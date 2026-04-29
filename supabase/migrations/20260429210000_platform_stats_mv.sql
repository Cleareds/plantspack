-- 1-row materialized view holding the homepage hero counters.
-- Replaces three queries on every /api/home cache miss:
--   1) sum 177 directory_countries rows in JS for totalPlaces
--   2) head count(*) on directory_cities for totalCities
--   3) count(*) on places where category='organisation' for sanctuaries
-- Now: SELECT * FROM platform_stats; (1 row, no aggregation at request time)

CREATE MATERIALIZED VIEW IF NOT EXISTS platform_stats AS
SELECT
  COUNT(*) FILTER (WHERE archived_at IS NULL)                                   AS total_places,
  COUNT(*) FILTER (WHERE archived_at IS NULL AND vegan_level = 'fully_vegan')   AS fully_vegan,
  COUNT(*) FILTER (WHERE archived_at IS NULL AND category = 'eat')              AS restaurants,
  COUNT(*) FILTER (WHERE archived_at IS NULL AND category = 'store')            AS stores,
  COUNT(*) FILTER (WHERE archived_at IS NULL AND category = 'hotel')            AS stays,
  COUNT(*) FILTER (WHERE archived_at IS NULL AND category = 'organisation')     AS sanctuaries,
  COUNT(DISTINCT country)
    FILTER (WHERE archived_at IS NULL AND country IS NOT NULL AND country <> '') AS countries,
  COUNT(DISTINCT (city, country))
    FILTER (WHERE archived_at IS NULL AND city IS NOT NULL AND city <> ''
                                       AND country IS NOT NULL AND country <> '') AS cities
FROM places;

-- CONCURRENTLY refresh requires a unique index. The view is always 1 row,
-- so a unique index on a constant works.
CREATE UNIQUE INDEX IF NOT EXISTS platform_stats_singleton
  ON platform_stats ((1));

-- Wire into the existing refresh cron so the stats stay in sync with all
-- other directory views.
CREATE OR REPLACE FUNCTION refresh_directory_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY directory_countries;
  REFRESH MATERIALIZED VIEW CONCURRENTLY directory_cities;
  REFRESH MATERIALIZED VIEW CONCURRENTLY city_scores;
  REFRESH MATERIALIZED VIEW CONCURRENTLY platform_stats;
END;
$$ LANGUAGE plpgsql;

-- Initial populate. CONCURRENTLY requires the MV to already be populated,
-- so the first refresh has to be non-concurrent.
REFRESH MATERIALIZED VIEW platform_stats;

-- Allow anon + authenticated to read the new view (matches city_scores grants).
GRANT SELECT ON platform_stats TO anon, authenticated;
