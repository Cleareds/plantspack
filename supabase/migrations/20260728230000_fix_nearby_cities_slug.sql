-- Fix the city_slug that nearby_cities() returns.
--
-- It built the slug as:
--   lower(regexp_replace(immutable_unaccent(city), '[^a-z0-9]+', '-', 'g'))
--
-- The regex ran on the still-mixed-case string, so every UPPERCASE letter fell
-- outside [a-z0-9] and was replaced with a hyphen; lower() then ran too late to
-- help. "Saint-Gilles" came out as "-aint-illes", "Schaerbeek" as "-chaerbeek".
-- It also never trimmed the leading/trailing hyphen.
--
-- Every "Nearby cities" link on every city page therefore pointed at a slug that
-- does not exist - six 404s on /vegan-places/belgium/brussels alone. The block
-- exists specifically to improve the internal crawl graph, so it was doing the
-- exact opposite.
--
-- This aligns the expression with the one directory_cities.city_slug already uses
-- (lower() first, then the character class, then trim), so the two agree and the
-- links resolve.

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
    -- Same expression as directory_cities.city_slug: lower() BEFORE the
    -- character class, then strip any leading/trailing hyphen.
    regexp_replace(
      regexp_replace(
        lower(public.immutable_unaccent(c.city)),
        '[^a-z0-9]+', '-', 'g'
      ),
      '^-|-$', '', 'g'
    ) AS city_slug,
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
