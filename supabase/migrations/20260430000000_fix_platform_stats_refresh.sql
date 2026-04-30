-- The unique index on platform_stats((1)) doesn't satisfy Postgres's
-- CONCURRENTLY-refresh requirement (constant expression). The MV has
-- exactly one row, so a non-concurrent refresh is fine - locks for
-- microseconds. Switch refresh_directory_views() to non-concurrent
-- for platform_stats only.

CREATE OR REPLACE FUNCTION refresh_directory_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY directory_countries;
  REFRESH MATERIALIZED VIEW CONCURRENTLY directory_cities;
  REFRESH MATERIALIZED VIEW CONCURRENTLY city_scores;
  REFRESH MATERIALIZED VIEW platform_stats;
END;
$$ LANGUAGE plpgsql;
