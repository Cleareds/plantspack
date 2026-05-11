-- nearby_cities RPC — given a source lat/lng and country, returns the
-- closest other cities sorted by ST_Distance. Used by the city page's
-- "Nearby cities" related-cities block.
--
-- Scoped to country to keep the centroid GROUP BY cheap (we never need
-- "cities near Leuven that happen to be in France"). Smallest cities
-- are excluded via the same MIN_CITY_PLACES = 5 threshold the country
-- page already uses, so we don't surface noise.

CREATE OR REPLACE FUNCTION public.nearby_cities(
  src_lat double precision,
  src_lng double precision,
  src_country text,
  lim int DEFAULT 8,
  exclude_city text DEFAULT NULL,
  min_places int DEFAULT 5
)
RETURNS TABLE (
  city text,
  city_slug text,
  place_count int,
  fully_vegan_count int,
  centroid_lat double precision,
  centroid_lng double precision,
  distance_km double precision
)
LANGUAGE sql STABLE
AS $$
  WITH centroids AS (
    SELECT
      p.city,
      AVG(p.latitude)  AS lat,
      AVG(p.longitude) AS lng,
      COUNT(*) AS pc,
      COUNT(*) FILTER (WHERE p.vegan_level = 'fully_vegan') AS fv
    FROM places p
    WHERE p.country = src_country
      AND p.archived_at IS NULL
      AND p.city IS NOT NULL
      AND p.latitude IS NOT NULL
      AND p.longitude IS NOT NULL
      AND (exclude_city IS NULL OR p.city <> exclude_city)
    GROUP BY p.city
    HAVING COUNT(*) >= min_places
  )
  SELECT
    c.city,
    lower(regexp_replace(public.immutable_unaccent(c.city), '[^a-z0-9]+', '-', 'g')) AS city_slug,
    c.pc::int,
    c.fv::int,
    c.lat,
    c.lng,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(c.lng, c.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(src_lng, src_lat), 4326)::geography
    ) / 1000.0 AS distance_km
  FROM centroids c
  ORDER BY distance_km ASC
  LIMIT lim;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_cities(double precision, double precision, text, int, text, int) TO anon, authenticated;
