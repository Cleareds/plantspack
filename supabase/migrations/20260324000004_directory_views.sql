-- Materialized views for fast directory page queries
-- Refreshed periodically, eliminates N+1 query pattern

-- Country summary: 1 row per country with pre-computed stats
CREATE MATERIALIZED VIEW IF NOT EXISTS directory_countries AS
SELECT
  country,
  count(*)::int AS place_count,
  count(*) FILTER (WHERE category = 'eat')::int AS eat_count,
  count(*) FILTER (WHERE category = 'store')::int AS store_count,
  count(*) FILTER (WHERE category = 'hotel')::int AS hotel_count,
  count(*) FILTER (WHERE vegan_level = 'fully_vegan')::int AS fully_vegan_count,
  count(*) FILTER (WHERE is_pet_friendly = true)::int AS pet_friendly_count,
  count(DISTINCT city)::int AS city_count,
  array_agg(DISTINCT cuisine_type) FILTER (WHERE cuisine_type IS NOT NULL AND cuisine_type != 'vegan') AS top_cuisines,
  (array_agg(name ORDER BY created_at DESC))[1:5] AS sample_names
FROM places
LEFT JOIN LATERAL unnest(cuisine_types) AS cuisine_type ON true
WHERE country IS NOT NULL AND country != ''
GROUP BY country
ORDER BY count(*) DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_directory_countries_country ON directory_countries (country);

-- City summary: 1 row per city with pre-computed stats
CREATE MATERIALIZED VIEW IF NOT EXISTS directory_cities AS
SELECT
  city,
  country,
  count(*)::int AS place_count,
  count(*) FILTER (WHERE category = 'eat')::int AS eat_count,
  count(*) FILTER (WHERE category = 'store')::int AS store_count,
  count(*) FILTER (WHERE category = 'hotel')::int AS hotel_count,
  count(*) FILTER (WHERE vegan_level = 'fully_vegan')::int AS fully_vegan_count,
  count(*) FILTER (WHERE is_pet_friendly = true)::int AS pet_friendly_count,
  (array_agg(DISTINCT ct) FILTER (WHERE ct IS NOT NULL AND ct != 'vegan'))[1:5] AS top_cuisines,
  (array_agg(name ORDER BY created_at DESC))[1:8] AS sample_names
FROM places
LEFT JOIN LATERAL unnest(cuisine_types) AS ct ON true
WHERE city IS NOT NULL AND city != '' AND country IS NOT NULL
GROUP BY city, country
ORDER BY count(*) DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_directory_cities_city_country ON directory_cities (city, country);
CREATE INDEX IF NOT EXISTS idx_directory_cities_country ON directory_cities (country);

-- Function to refresh both views (call after imports or periodically)
CREATE OR REPLACE FUNCTION refresh_directory_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY directory_countries;
  REFRESH MATERIALIZED VIEW CONCURRENTLY directory_cities;
END;
$$ LANGUAGE plpgsql;

-- Initial refresh
SELECT refresh_directory_views();
