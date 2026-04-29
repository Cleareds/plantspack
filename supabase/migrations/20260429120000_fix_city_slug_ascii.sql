-- Fix directory_cities city_slug so it strips diacritics for German/European
-- city names (Düsseldorf, Köln, Nürnberg, München, São Paulo, etc.).
-- The previous version used unaccent() which on this installation does not
-- strip ü/ö/ä/ß reliably. We use explicit translate() to guarantee a clean
-- ASCII slug.

DROP MATERIALIZED VIEW IF EXISTS directory_cities CASCADE;

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
  -- ASCII-only slug. translate() maps each accented char to its ASCII equivalent.
  -- Covers: German (äöüß), French/Spanish/Portuguese/Italian (áàâãéèêíìîóòôõúùûñç),
  -- Czech/Polish/Croatian (žščňřťďĺľýź), Scandinavian (åøæ).
  regexp_replace(
    regexp_replace(
      translate(
        lower(p.city),
        'äöüáàâãåéèêëíìîïóòôõøúùûüçñýÿžščřňťďĺľźłæœßÄÖÜÁÀÂÃÅÉÈÊËÍÌÎÏÓÒÔÕØÚÙÛÜÇÑÝŽŠČŘŇŤĎĹĽŹŁÆŒ',
        'aoua aaaaeeeei iiiooooo uuuucnyyzscrntdllzlae ssaouaaaaaeeeeiiiiooooo uuuucnyzscrntdllzlae'
      ),
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
  AND p.archived_at IS NULL
GROUP BY p.city, p.country, c.all_cuisines
ORDER BY count(*) DESC;

CREATE UNIQUE INDEX idx_directory_cities_city_country ON directory_cities (city, country);
CREATE INDEX idx_directory_cities_country ON directory_cities (country);
CREATE INDEX idx_directory_cities_slug ON directory_cities (city_slug);
