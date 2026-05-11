-- Add search_countries RPC so typing a country name surfaces the
-- country card directly instead of trigram-adjacent cities.
-- Before this, searching "Belgium" returned Belgrade + Bell-town
-- variants from search_cities because countries were not searched.

-- Trigram index on directory_countries.country for autocomplete.
CREATE INDEX IF NOT EXISTS idx_directory_countries_country_immutable_unaccent_trgm
  ON directory_countries USING gin((public.immutable_unaccent(country)) gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_countries(
  q text,
  vl text DEFAULT NULL,
  result_limit int DEFAULT 4
)
RETURNS TABLE (
  country text,
  country_slug text,
  place_count int,
  city_count int,
  rank real
)
LANGUAGE sql STABLE
AS $$
  WITH q_norm AS (SELECT public.immutable_unaccent(q) AS qn)
  SELECT
    dc.country,
    dc.country_slug,
    dc.place_count,
    dc.city_count,
    (
      -- Trigram similarity is the primary signal. Exact-prefix
      -- matches get a strong boost so "Belg" surfaces "Belgium"
      -- ahead of trigram-near-but-prefix-different countries.
      similarity(public.immutable_unaccent(dc.country), (SELECT qn FROM q_norm)) * 5
      + CASE
          WHEN public.immutable_unaccent(dc.country) ILIKE (SELECT qn FROM q_norm) || '%' THEN 2.0
          ELSE 0
        END
      + ln(1 + dc.place_count) * 0.4
    )::real AS rank
  FROM directory_countries dc, q_norm
  WHERE
    public.immutable_unaccent(dc.country) % (SELECT qn FROM q_norm)
    OR public.immutable_unaccent(dc.country) ILIKE (SELECT qn FROM q_norm) || '%'
  ORDER BY rank DESC
  LIMIT result_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_countries(text, text, int) TO anon, authenticated;
