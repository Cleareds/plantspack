-- Add fully_vegan_count to directory_countries (was dropped in 20260424180000 migration)

DROP MATERIALIZED VIEW IF EXISTS directory_countries CASCADE;

CREATE MATERIALIZED VIEW directory_countries AS
SELECT
  country,
  count(DISTINCT city)::int AS city_count,
  count(*)::int AS place_count,
  count(*) FILTER (WHERE vegan_level = 'fully_vegan')::int AS fully_vegan_count,
  lower(regexp_replace(country, '\s+', '-', 'g')) AS country_slug
FROM places
WHERE country IS NOT NULL AND country != '' AND archived_at IS NULL
GROUP BY country
ORDER BY count(*) DESC;

CREATE UNIQUE INDEX idx_directory_countries_country ON directory_countries (country);
CREATE INDEX idx_directory_countries_slug ON directory_countries (country_slug);

SELECT refresh_directory_views();
