-- Search overhaul: FTS + trigram + unaccent, ranked RPCs.
-- Trigger-maintained tsvector on places (Postgres won't let us use a
-- STORED generated column here because to_tsvector + unaccent isn't
-- recognised as strictly immutable when wrapped).
--
-- unaccent + pg_trgm + postgis are all already enabled on this DB.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- =============================================================
-- 1. immutable_unaccent: standard wrapper so the planner accepts
--    unaccent() in functional indexes.
-- =============================================================
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1);
$$;

-- =============================================================
-- 2. search_vector column on places, maintained by trigger.
--    Weights: A = name, B = city/country, C = cuisine_types, D = description.
--    Config = 'simple' (no language stemming on a 160-country directory).
-- =============================================================
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.places_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(NEW.name, ''))), 'A') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(NEW.city, ''))), 'B') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(NEW.country, ''))), 'B') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(array_to_string(NEW.cuisine_types, ' '), ''))), 'C') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(NEW.description, ''))), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_places_search_vector ON places;
CREATE TRIGGER trg_places_search_vector
  BEFORE INSERT OR UPDATE OF name, city, country, cuisine_types, description
  ON places
  FOR EACH ROW
  EXECUTE FUNCTION public.places_search_vector_update();

-- Backfill existing rows in batches via UPDATE — the trigger fires on UPDATE
-- so this populates search_vector for everything currently in the table.
-- ~52K rows; runs in a few seconds.
UPDATE places SET name = name WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS idx_places_search_vector
  ON places USING gin(search_vector);

-- Diacritic-insensitive trigram on name (for fuzzy / typo / accent matches).
CREATE INDEX IF NOT EXISTS idx_places_name_immutable_unaccent_trgm
  ON places USING gin((public.immutable_unaccent(name)) gin_trgm_ops);

-- City trigram index for autocomplete on directory_cities.
CREATE INDEX IF NOT EXISTS idx_directory_cities_city_immutable_unaccent_trgm
  ON directory_cities USING gin((public.immutable_unaccent(city)) gin_trgm_ops);

-- =============================================================
-- 3. RPC: search_places — composite of FTS + trigram + popularity
--    + vegan-level bonus + locality penalty.
-- =============================================================
CREATE OR REPLACE FUNCTION public.search_places(
  q text,
  vl text DEFAULT NULL,
  cat text DEFAULT NULL,
  near_lat double precision DEFAULT NULL,
  near_lng double precision DEFAULT NULL,
  result_limit int DEFAULT 12
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  city text,
  country text,
  vegan_level text,
  category text,
  main_image_url text,
  average_rating numeric,
  review_count int,
  verification_level int,
  distance_km double precision,
  rank real
)
LANGUAGE sql STABLE
AS $$
  WITH q_norm AS (
    SELECT public.immutable_unaccent(q) AS qn,
           plainto_tsquery('simple', public.immutable_unaccent(q)) AS tsq
  )
  SELECT
    p.id, p.slug, p.name, p.city, p.country, p.vegan_level, p.category,
    p.main_image_url, p.average_rating, p.review_count, p.verification_level,
    CASE
      WHEN near_lat IS NOT NULL AND near_lng IS NOT NULL AND p.geom IS NOT NULL
        THEN ST_Distance(
               p.geom,
               ST_SetSRID(ST_MakePoint(near_lng, near_lat), 4326)::geography
             ) / 1000.0
      ELSE NULL
    END AS distance_km,
    (
      ts_rank(p.search_vector, (SELECT tsq FROM q_norm)) * 4
      + similarity(public.immutable_unaccent(p.name), (SELECT qn FROM q_norm)) * 3
      + COALESCE(p.average_rating, 0) * 0.15
      + ln(1 + COALESCE(p.review_count, 0)) * 0.4
      + CASE p.vegan_level
          WHEN 'fully_vegan'    THEN 0.8
          WHEN 'mostly_vegan'   THEN 0.4
          WHEN 'vegan_friendly' THEN 0.1
          ELSE 0
        END
      + COALESCE(p.verification_level, 0) * 0.2
      - CASE
          WHEN near_lat IS NOT NULL AND near_lng IS NOT NULL AND p.geom IS NOT NULL
            THEN LEAST(
                   ST_Distance(p.geom, ST_SetSRID(ST_MakePoint(near_lng, near_lat), 4326)::geography) / 50000.0,
                   1.0
                 )
          ELSE 0
        END
    )::real AS rank
  FROM places p, q_norm
  WHERE p.archived_at IS NULL
    AND (vl  IS NULL OR p.vegan_level = vl)
    AND (cat IS NULL OR p.category    = cat)
    AND (
      p.search_vector @@ (SELECT tsq FROM q_norm)
      OR public.immutable_unaccent(p.name) % (SELECT qn FROM q_norm)
    )
  ORDER BY rank DESC
  LIMIT result_limit;
$$;

-- =============================================================
-- 4. RPC: search_cities — trigram-ranked autocomplete.
-- =============================================================
CREATE OR REPLACE FUNCTION public.search_cities(
  q text,
  vl text DEFAULT NULL,
  result_limit int DEFAULT 8
)
RETURNS TABLE (
  city text,
  country text,
  city_slug text,
  country_slug text,
  place_count int,
  fully_vegan_count int,
  rank real
)
LANGUAGE sql STABLE
AS $$
  WITH q_norm AS (SELECT public.immutable_unaccent(q) AS qn)
  SELECT
    dc.city,
    dc.country,
    dc.city_slug,
    dco.country_slug,
    CASE WHEN vl = 'fully_vegan' THEN dc.fully_vegan_count ELSE dc.place_count END AS place_count,
    dc.fully_vegan_count,
    (
      similarity(public.immutable_unaccent(dc.city), (SELECT qn FROM q_norm)) * 4
      + ln(1 + dc.place_count) * 0.5
    )::real AS rank
  FROM directory_cities dc
  LEFT JOIN directory_countries dco ON dco.country = dc.country
  , q_norm
  WHERE
    public.immutable_unaccent(dc.city) % (SELECT qn FROM q_norm)
    OR public.immutable_unaccent(dc.city) ILIKE (SELECT qn FROM q_norm) || '%'
  ORDER BY rank DESC
  LIMIT result_limit;
$$;

-- =============================================================
-- 5. RPC: search_recipes — recipes = posts where category='recipe'.
-- =============================================================
CREATE OR REPLACE FUNCTION public.search_recipes(
  q text,
  result_limit int DEFAULT 6
)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  image_url text,
  created_at timestamptz,
  rank real
)
LANGUAGE sql STABLE
AS $$
  WITH q_norm AS (
    SELECT public.immutable_unaccent(q) AS qn,
           plainto_tsquery('simple', public.immutable_unaccent(q)) AS tsq
  )
  SELECT
    p.id, p.slug, p.title, p.image_url, p.created_at,
    (
      ts_rank(
        to_tsvector('simple', public.immutable_unaccent(coalesce(p.title, ''))),
        (SELECT tsq FROM q_norm)
      ) * 4
      + similarity(public.immutable_unaccent(p.title), (SELECT qn FROM q_norm)) * 3
    )::real AS rank
  FROM posts p, q_norm
  WHERE p.category = 'recipe'
    AND p.deleted_at IS NULL
    AND p.title IS NOT NULL
    AND (
      to_tsvector('simple', public.immutable_unaccent(coalesce(p.title, ''))) @@ (SELECT tsq FROM q_norm)
      OR public.immutable_unaccent(p.title) % (SELECT qn FROM q_norm)
    )
  ORDER BY rank DESC
  LIMIT result_limit;
$$;

-- =============================================================
-- 6. P2 instrumentation — search_logs table.
-- =============================================================
CREATE TABLE IF NOT EXISTS public.search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  q text NOT NULL,
  q_normalized text,
  result_count int NOT NULL DEFAULT 0,
  clicked_slug text,
  clicked_kind text,
  session_id text,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_logs_q_normalized
  ON public.search_logs (q_normalized);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at
  ON public.search_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_logs_zero_result
  ON public.search_logs (result_count, created_at DESC)
  WHERE result_count = 0;

ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "search_logs insert anon" ON public.search_logs;
CREATE POLICY "search_logs insert anon"
  ON public.search_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- =============================================================
-- 7. Grants.
-- =============================================================
GRANT EXECUTE ON FUNCTION public.search_places(text, text, text, double precision, double precision, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_cities(text, text, int)                                            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_recipes(text, int)                                                 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.immutable_unaccent(text)                                                  TO anon, authenticated;
