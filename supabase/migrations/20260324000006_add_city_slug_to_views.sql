-- Add city_slug to directory_cities view for URL matching
-- unaccent() strips accents so slug-based lookups work

DROP MATERIALIZED VIEW IF EXISTS directory_cities;

CREATE MATERIALIZED VIEW directory_cities AS
WITH cuisine_agg AS (
  SELECT city, country, array_agg(DISTINCT ct) FILTER (WHERE ct IS NOT NULL AND ct != '' AND ct != 'vegan') AS all_cuisines
  FROM places, unnest(cuisine_types) AS ct
  WHERE city IS NOT NULL AND city != '' AND country IS NOT NULL
  GROUP BY city, country
)
SELECT
  p.city,
  p.country,
  -- URL-safe slug from city name (lowercase, accents removed, special chars → hyphens)
  regexp_replace(
    regexp_replace(
      lower(unaccent(p.city)),
      '[^a-z0-9]+', '-', 'g'
    ),
    '^-|-$', '', 'g'
  ) AS city_slug,
  count(*)::int AS place_count,
  count(*) FILTER (WHERE p.category = 'eat')::int AS eat_count,
  count(*) FILTER (WHERE p.category = 'store')::int AS store_count,
  count(*) FILTER (WHERE p.category = 'hotel')::int AS hotel_count,
  count(*) FILTER (WHERE p.vegan_level = 'fully_vegan')::int AS fully_vegan_count,
  count(*) FILTER (WHERE p.is_pet_friendly = true)::int AS pet_friendly_count,
  COALESCE(c.all_cuisines[1:5], '{}') AS top_cuisines,
  (array_agg(p.name ORDER BY p.created_at DESC))[1:8] AS sample_names
FROM places p
LEFT JOIN cuisine_agg c ON c.city = p.city AND c.country = p.country
WHERE p.city IS NOT NULL AND p.city != '' AND p.country IS NOT NULL
GROUP BY p.city, p.country, c.all_cuisines
ORDER BY count(*) DESC;

CREATE UNIQUE INDEX idx_directory_cities_city_country ON directory_cities (city, country);
CREATE INDEX idx_directory_cities_country ON directory_cities (country);
CREATE INDEX idx_directory_cities_slug ON directory_cities (city_slug);

-- Also add country_slug to directory_countries
DROP MATERIALIZED VIEW IF EXISTS directory_countries;

CREATE MATERIALIZED VIEW directory_countries AS
WITH cuisine_agg AS (
  SELECT country, array_agg(DISTINCT ct) FILTER (WHERE ct IS NOT NULL AND ct != '' AND ct != 'vegan') AS all_cuisines
  FROM places, unnest(cuisine_types) AS ct
  WHERE country IS NOT NULL AND country != ''
  GROUP BY country
)
SELECT
  p.country,
  regexp_replace(
    regexp_replace(lower(unaccent(p.country)), '[^a-z0-9]+', '-', 'g'),
    '^-|-$', '', 'g'
  ) AS country_slug,
  count(*)::int AS place_count,
  count(*) FILTER (WHERE p.category = 'eat')::int AS eat_count,
  count(*) FILTER (WHERE p.category = 'store')::int AS store_count,
  count(*) FILTER (WHERE p.category = 'hotel')::int AS hotel_count,
  count(*) FILTER (WHERE p.vegan_level = 'fully_vegan')::int AS fully_vegan_count,
  count(*) FILTER (WHERE p.is_pet_friendly = true)::int AS pet_friendly_count,
  count(DISTINCT p.city)::int AS city_count,
  COALESCE(c.all_cuisines[1:5], '{}') AS top_cuisines,
  (array_agg(p.name ORDER BY p.created_at DESC))[1:5] AS sample_names
FROM places p
LEFT JOIN cuisine_agg c ON c.country = p.country
WHERE p.country IS NOT NULL AND p.country != ''
GROUP BY p.country, c.all_cuisines
ORDER BY count(*) DESC;

CREATE UNIQUE INDEX idx_directory_countries_country ON directory_countries (country);
CREATE INDEX idx_directory_countries_slug ON directory_countries (country_slug);

SELECT refresh_directory_views();
