-- 2026-05-23: exclude organisation + event categories from city scores.
-- After the overnight non-food import, sanctuaries and advocacy chapters
-- start to skew rural city scores (e.g. Watkins Glen NY gets +1 fv_count
-- from Farm Sanctuary, which isn't a restaurant accessibility signal).
-- TODO: reconsider once we have a way to surface non-eat venues on
-- city pages with their own tabs and the score weighting is decoupled.

-- platform_stats depends on city_scores; CASCADE to drop both, then recreate.
DROP MATERIALIZED VIEW IF EXISTS platform_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS city_scores CASCADE;

CREATE MATERIALIZED VIEW city_scores AS
WITH per_place AS (
  SELECT
    city,
    country,
    category,
    vegan_level,
    latitude,
    longitude,
    COALESCE(average_rating, 0)::numeric AS rating,
    COALESCE(review_count, 0) AS rc,
    CASE vegan_level
      WHEN 'fully_vegan' THEN 1.0
      WHEN 'vegan_friendly' THEN 0.35
      ELSE 0
    END::numeric AS ve,
    (5.0 * 3.8 + COALESCE(review_count, 0) * COALESCE(average_rating, 0)::numeric)
      / (5.0 + COALESCE(review_count, 0)) AS smoothed_rating
  FROM places
  WHERE city IS NOT NULL AND city != ''
    AND country IS NOT NULL AND country != ''
    AND archived_at IS NULL
    -- 2026-05-23: organisation + event excluded so sanctuaries and
    -- vegan festivals don't dilute the restaurant/store/hotel score.
    AND category NOT IN ('organisation', 'event')
),
agg AS (
  SELECT
    city,
    country,
    count(*)::int AS place_count,
    count(*) FILTER (WHERE vegan_level = 'fully_vegan')::int AS fv_count,
    count(*) FILTER (WHERE vegan_level = 'vegan_friendly')::int AS vf_count,
    SUM(ve)::numeric AS ve_total,
    COALESCE(SUM(ve) FILTER (WHERE category = 'eat'), 0)::numeric AS ve_eat,
    COALESCE(SUM(ve) FILTER (WHERE category = 'store'), 0)::numeric AS ve_store,
    COALESCE(SUM(ve) FILTER (WHERE category = 'hotel'), 0)::numeric AS ve_hotel,
    -- ve_event / ve_org kept at 0 - column preserved for downstream code that reads them.
    0::numeric AS ve_event,
    0::numeric AS ve_org,
    COALESCE(
      SUM((0.5 + rc) * smoothed_rating) / NULLIF(SUM(0.5 + rc), 0),
      3.8
    )::numeric AS weighted_rating,
    COALESCE(SUM(rc), 0)::numeric AS total_reviews,
    AVG(latitude)::numeric AS center_lat,
    AVG(longitude)::numeric AS center_lng
  FROM per_place
  GROUP BY city, country
),
scored AS (
  SELECT
    a.city,
    a.country,
    a.place_count,
    a.fv_count,
    a.vf_count,
    a.ve_total,
    cp.population,
    a.center_lat,
    a.center_lng,
    CASE
      WHEN cp.population IS NULL OR cp.population <= 0 THEN
        LEAST(25::numeric, 24.0 * ln(1 + a.ve_total) / ln(51))
      ELSE
        LEAST(
          25::numeric,
          0.35 * (24.0 * ln(1 + a.ve_total) / ln(51))
          + 0.65 * (25.0 * (1 - exp(-(a.ve_total / (cp.population / 100000.0)) / 6.0)))
        )
    END AS accessibility_raw,
    LEAST(
      25::numeric,
      20.0 * ln(1 + a.ve_total) / ln(81)
      + 5.0 * sqrt(LEAST(1.0, (a.fv_count::numeric / NULLIF(a.place_count, 0)) * 2))
    ) AS choice_raw,
    LEAST(
      25::numeric,
      10.0 * CASE WHEN a.ve_eat   >= 8 THEN 1.0 WHEN a.ve_eat   >= 3 THEN 0.7 WHEN a.ve_eat   >= 1 THEN 0.4 WHEN a.ve_eat   > 0 THEN 0.15 ELSE 0 END
    +  6.0 * CASE WHEN a.ve_store >= 8 THEN 1.0 WHEN a.ve_store >= 3 THEN 0.7 WHEN a.ve_store >= 1 THEN 0.4 WHEN a.ve_store > 0 THEN 0.15 ELSE 0 END
    +  5.0 * CASE WHEN a.ve_hotel >= 8 THEN 1.0 WHEN a.ve_hotel >= 3 THEN 0.7 WHEN a.ve_hotel >= 1 THEN 0.4 WHEN a.ve_hotel > 0 THEN 0.15 ELSE 0 END
    +  2.0 * CASE WHEN a.ve_event >= 8 THEN 1.0 WHEN a.ve_event >= 3 THEN 0.7 WHEN a.ve_event >= 1 THEN 0.4 WHEN a.ve_event > 0 THEN 0.15 ELSE 0 END
    +  2.0 * CASE WHEN a.ve_org   >= 8 THEN 1.0 WHEN a.ve_org   >= 3 THEN 0.7 WHEN a.ve_org   >= 1 THEN 0.4 WHEN a.ve_org   > 0 THEN 0.15 ELSE 0 END
    ) AS variety_raw,
    LEAST(
      25::numeric,
      GREATEST(0::numeric, 18.0 * (a.weighted_rating - 3.0) / 2.0)
      + CASE
          WHEN a.fv_count > 0 THEN 7.0 * LEAST(1.0, a.total_reviews / (3.0 * a.fv_count))
          ELSE 0
        END
    ) AS quality_raw
  FROM agg a
  LEFT JOIN city_populations cp ON cp.city = a.city AND cp.country = a.country
  WHERE a.place_count >= 5
),
final AS (
  SELECT
    city, country, place_count, fv_count, vf_count,
    ROUND(ve_total, 2) AS ve_total,
    population,
    CASE WHEN population IS NOT NULL AND population > 0
      THEN ROUND((fv_count::numeric / population) * 100000, 2)
    END AS per_capita,
    center_lat, center_lng,
    ROUND(COALESCE(accessibility_raw, 0))::int AS accessibility,
    ROUND(choice_raw)::int AS choice,
    ROUND(variety_raw)::int AS variety,
    ROUND(COALESCE(quality_raw, 0))::int AS quality,
    LEAST(100, ROUND(COALESCE(accessibility_raw, 0) + choice_raw + variety_raw + COALESCE(quality_raw, 0)))::int AS score
  FROM scored
)
SELECT
  city, country,
  regexp_replace(
    regexp_replace(lower(unaccent(city)), '[^a-z0-9]+', '-', 'g'),
    '^-|-$', '', 'g'
  ) AS city_slug,
  place_count, fv_count, vf_count, ve_total, population, per_capita,
  accessibility, choice, variety, quality, score,
  CASE
    WHEN score >= 88 THEN 'A+'
    WHEN score >= 78 THEN 'A'
    WHEN score >= 62 THEN 'B'
    WHEN score >= 45 THEN 'C'
    WHEN score >= 30 THEN 'D'
    ELSE 'F'
  END AS grade,
  center_lat, center_lng,
  NOW() AS computed_at
FROM final;

CREATE UNIQUE INDEX idx_city_scores_city_country ON city_scores (city, country);
CREATE INDEX idx_city_scores_score_desc ON city_scores (score DESC, place_count DESC);
CREATE INDEX idx_city_scores_country_score ON city_scores (country, score DESC);
CREATE INDEX idx_city_scores_slug ON city_scores (city_slug);

-- Refresh now to clear sanctuary contributions
REFRESH MATERIALIZED VIEW city_scores;

-- Recreate platform_stats (was CASCADE-dropped above).
CREATE MATERIALIZED VIEW platform_stats AS
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
                                       AND country IS NOT NULL AND country <> '') AS cities,
  (SELECT COUNT(*) FROM city_scores)                                            AS cities_ranked
FROM places;
CREATE UNIQUE INDEX IF NOT EXISTS platform_stats_singleton ON platform_stats ((1));
REFRESH MATERIALIZED VIEW platform_stats;
GRANT SELECT ON platform_stats TO anon, authenticated;
